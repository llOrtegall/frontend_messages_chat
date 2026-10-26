import type { Message, Room, RoomWithMembers, ServerEvent } from "../domain/entities.ts";
import type { AttachmentUploader, ConnectionStatus, MessageRepository, RealtimeGateway, RoomRepository } from "../domain/ports.ts";
import { mergeMessages, removeMessage, touchRoom, upsertMessage, upsertRoom, sortRoomsByActivity } from "../domain/rules.ts";
import { errorMessage, Store } from "./store.ts";

export interface ChatState {
  connection: ConnectionStatus;
  rooms: Room[];
  roomsLoaded: boolean;
  selectedRoomId: string | null;
  /** Detail (members) of the selected room, null while loading. */
  selectedRoom: RoomWithMembers | null;
  /** Loaded messages per room, oldest first. Rooms never opened have no entry. */
  messages: Record<string, Message[]>;
  history: Record<string, { loading: boolean; hasMore: boolean }>;
  unread: Record<string, number>;
  /** User ids currently typing, per room. */
  typing: Record<string, string[]>;
  /** Presence learned from push events since start (overrides fetched isOnline). */
  presence: Record<string, boolean>;
  error: string | null;
}

interface Deps {
  currentUserId: string;
  rooms: RoomRepository;
  messages: MessageRepository;
  attachments: AttachmentUploader;
  realtime: RealtimeGateway;
}

interface Options {
  pageSize?: number;
  typingTtlMs?: number;
  typingThrottleMs?: number;
}

const initialState: ChatState = {
  connection: "closed",
  rooms: [],
  roomsLoaded: false,
  selectedRoomId: null,
  selectedRoom: null,
  messages: {},
  history: {},
  unread: {},
  typing: {},
  presence: {},
  error: null,
};

const without = <T>(record: Record<string, T>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

/**
 * Chat use cases and their state. Real-time events keep rooms and messages current; every
 * (re)connect reloads rooms and the open room because events missed while offline are not replayed.
 */
export class ChatStore extends Store<ChatState> {
  private readonly pageSize: number;
  private readonly typingTtlMs: number;
  private readonly typingThrottleMs: number;
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly lastTypingSent = new Map<string, number>();
  /** Message ids already counted as unread, so a duplicated event doesn't count twice. */
  private readonly countedUnread = new Map<string, Set<string>>();
  /** Last message id acknowledged with chat.read, per room (avoids resending the same one). */
  private readonly lastReadSent = new Map<string, string>();
  private unsubscribers: (() => void)[] = [];

  constructor(private readonly deps: Deps, options: Options = {}) {
    super(initialState);
    this.pageSize = options.pageSize ?? 50;
    this.typingTtlMs = options.typingTtlMs ?? 3000;
    this.typingThrottleMs = options.typingThrottleMs ?? 2000;
  }

  start(): void {
    if (this.unsubscribers.length > 0) return;
    const { realtime } = this.deps;
    this.unsubscribers = [
      realtime.onEvent((e) => this.handleEvent(e)),
      realtime.onStatus((status) => {
        this.setState({ connection: status });
        if (status === "open") void this.resync();
      }),
    ];
    realtime.connect();
  }

  stop(): void {
    for (const u of this.unsubscribers) u();
    this.unsubscribers = [];
    for (const t of this.typingTimers.values()) clearTimeout(t);
    this.typingTimers.clear();
    this.deps.realtime.disconnect();
  }

  async reloadRooms(): Promise<void> {
    try {
      const rooms = await this.deps.rooms.list();
      this.setRooms(sortRoomsByActivity(rooms));
      // The server's count is authoritative; the open room is being read right now.
      this.countedUnread.clear();
      const selected = this.getSnapshot().selectedRoomId;
      const unread = Object.fromEntries(
        rooms.filter((r) => r.unreadCount > 0 && r.id !== selected).map((r) => [r.id, r.unreadCount]),
      );
      this.setState({ roomsLoaded: true, unread });
    } catch (err) {
      this.fail(err, "No se pudieron cargar las conversaciones");
    }
  }

  async selectRoom(roomId: string | null): Promise<void> {
    this.countedUnread.delete(roomId ?? "");
    this.setState((s) => ({
      selectedRoomId: roomId,
      selectedRoom: null,
      unread: roomId ? without(s.unread, roomId) : s.unread,
      error: null,
    }));
    if (!roomId) return;

    const [detail] = await Promise.all([
      this.deps.rooms.get(roomId).catch(() => null),
      this.getSnapshot().messages[roomId] ? Promise.resolve() : this.loadPage(roomId),
    ]);
    if (detail && this.getSnapshot().selectedRoomId === roomId) this.setState({ selectedRoom: detail });
    this.markRead(roomId);
  }

  /** Loads the page of messages older than the oldest one loaded. */
  async loadOlder(roomId: string): Promise<void> {
    const h = this.getSnapshot().history[roomId];
    if (!h || h.loading || !h.hasMore) return;
    await this.loadPage(roomId, this.getSnapshot().messages[roomId]?.[0]?.id);
  }

  /** Sends text and/or a file (uploaded first). */
  async send(roomId: string, body: string, file?: Blob): Promise<boolean> {
    const text = body.trim();
    if (!text && !file) return false;
    return this.attempt(async () => {
      const attachmentKey = file ? await this.deps.attachments.upload(file) : undefined;
      await this.deps.realtime.request("chat.send", { roomId, body: text, attachmentKey, clientMessageId: crypto.randomUUID() });
    }, "No se pudo enviar el mensaje");
  }

  edit(messageId: string, body: string): Promise<boolean> {
    return this.attempt(
      () => this.deps.realtime.request("chat.edit", { messageId, body: body.trim() }),
      "No se pudo editar el mensaje",
    );
  }

  deleteMessage(messageId: string): Promise<boolean> {
    return this.attempt(() => this.deps.realtime.request("chat.delete", { messageId }), "No se pudo borrar el mensaje");
  }

  deleteRoom(roomId: string): Promise<boolean> {
    // The room.removed event updates the list for every member, this tab included.
    return this.attempt(() => this.deps.rooms.delete(roomId), "No se pudo eliminar la conversación");
  }

  /** Opens (creating if needed) the DM with a user and selects it. Throws on failure. */
  async openDirect(userId: string): Promise<string> {
    const room = await this.deps.rooms.openDirect(userId);
    this.setRooms(upsertRoom(this.getSnapshot().rooms, room));
    void this.selectRoom(room.id);
    return room.id;
  }

  /** Creates a group and selects it. Throws on failure. */
  async createGroup(name: string, memberIds: string[]): Promise<string> {
    const room = await this.deps.rooms.createGroup(name.trim(), memberIds);
    this.setRooms(upsertRoom(this.getSnapshot().rooms, room));
    void this.selectRoom(room.id);
    return room.id;
  }

  /** Throttled "is typing" notification for the given room. */
  notifyTyping(roomId: string): void {
    const now = Date.now();
    if (now - (this.lastTypingSent.get(roomId) ?? 0) < this.typingThrottleMs) return;
    this.lastTypingSent.set(roomId, now);
    this.deps.realtime.notify("chat.typing", { roomId });
  }

  dismissError(): void {
    this.setState({ error: null });
  }

  private async resync(): Promise<void> {
    await this.reloadRooms();
    const roomId = this.getSnapshot().selectedRoomId;
    if (roomId && this.getSnapshot().messages[roomId]) {
      await this.loadPage(roomId, undefined, true);
      this.markRead(roomId);
    }
  }

  /** Persists that the open room has been read up to its newest loaded message. */
  private markRead(roomId: string): void {
    const last = this.getSnapshot().messages[roomId]?.at(-1)?.id;
    const sent = this.lastReadSent.get(roomId);
    if (!last || (sent && last <= sent) || this.getSnapshot().connection !== "open") return;
    this.lastReadSent.set(roomId, last);
    this.deps.realtime.request("chat.read", { roomId, messageId: last }).catch(() => {
      if (this.lastReadSent.get(roomId) === last) this.lastReadSent.delete(roomId); // retry next time
    });
  }

  /** `refresh` merges the newest page into what is loaded instead of starting the history. */
  private async loadPage(roomId: string, before?: string, refresh = false): Promise<void> {
    this.setHistory(roomId, { loading: true });
    try {
      const page = await this.deps.messages.list(roomId, { before, limit: this.pageSize });
      this.setState((s) => ({
        messages: { ...s.messages, [roomId]: mergeMessages(s.messages[roomId] ?? [], page) },
      }));
      this.setHistory(roomId, refresh ? { loading: false } : { loading: false, hasMore: page.length === this.pageSize });
    } catch (err) {
      this.setHistory(roomId, { loading: false });
      this.fail(err, "No se pudieron cargar los mensajes");
    }
  }

  private setHistory(roomId: string, patch: Partial<{ loading: boolean; hasMore: boolean }>): void {
    this.setState((s) => ({
      history: { ...s.history, [roomId]: { ...(s.history[roomId] ?? { loading: false, hasMore: true }), ...patch } },
    }));
  }

  private setRooms(rooms: Room[]): void {
    this.setState({ rooms });
    this.deps.realtime.setRooms(rooms.map((r) => r.id));
  }

  private async attempt(action: () => Promise<unknown>, fallback: string): Promise<boolean> {
    try {
      await action();
      return true;
    } catch (err) {
      this.fail(err, fallback);
      return false;
    }
  }

  private fail(err: unknown, fallback: string): void {
    this.setState({ error: errorMessage(err, fallback) });
  }

  private handleEvent(event: ServerEvent): void {
    const me = this.deps.currentUserId;
    switch (event.type) {
      case "message.created": {
        const m = event.payload;
        this.setState((s) => ({
          rooms: touchRoom(s.rooms, m.roomId, m.createdAt),
          messages: s.messages[m.roomId] ? { ...s.messages, [m.roomId]: upsertMessage(s.messages[m.roomId]!, m) } : s.messages,
          typing: s.typing[m.roomId] ? { ...s.typing, [m.roomId]: s.typing[m.roomId]!.filter((u) => u !== m.senderId) } : s.typing,
        }));
        if (m.senderId === me) break;
        if (m.roomId === this.getSnapshot().selectedRoomId) this.markRead(m.roomId);
        else this.countUnread(m);
        break;
      }
      case "message.edited": {
        const m = event.payload;
        this.setState((s) =>
          s.messages[m.roomId] ? { messages: { ...s.messages, [m.roomId]: upsertMessage(s.messages[m.roomId]!, m) } } : {},
        );
        break;
      }
      case "message.deleted": {
        const { roomId, messageId } = event.payload;
        this.setState((s) =>
          s.messages[roomId] ? { messages: { ...s.messages, [roomId]: removeMessage(s.messages[roomId]!, messageId) } } : {},
        );
        break;
      }
      case "user.typing": {
        const { roomId, userId } = event.payload;
        if (userId !== me) this.markTyping(roomId, userId);
        break;
      }
      case "room.added":
        this.setRooms(upsertRoom(this.getSnapshot().rooms, event.payload.room));
        break;
      case "room.removed": {
        const { roomId } = event.payload;
        const s = this.getSnapshot();
        this.setRooms(s.rooms.filter((r) => r.id !== roomId));
        this.countedUnread.delete(roomId);
        this.setState((st) => ({
          unread: without(st.unread, roomId),
          messages: without(st.messages, roomId),
          history: without(st.history, roomId),
          ...(st.selectedRoomId === roomId ? { selectedRoomId: null, selectedRoom: null } : {}),
        }));
        break;
      }
      case "room.member_added":
      case "room.member_removed": {
        const { roomId } = event.payload;
        const room = this.getSnapshot().selectedRoom;
        if (room?.id !== roomId) break;
        const members =
          event.type === "room.member_added"
            ? [...room.members.filter((m) => m.userId !== event.payload.member.userId), event.payload.member]
            : room.members.filter((m) => m.userId !== event.payload.userId);
        this.setState({ selectedRoom: { ...room, members } });
        break;
      }
      case "presence.online":
      case "presence.offline":
        this.setState((s) => ({ presence: { ...s.presence, [event.payload.userId]: event.type === "presence.online" } }));
        break;
      case "message.read":
        // Read in another tab or device of mine: clear the badge here too.
        if (event.payload.userId === me) {
          this.countedUnread.delete(event.payload.roomId);
          this.setState((s) => (s.unread[event.payload.roomId] ? { unread: without(s.unread, event.payload.roomId) } : {}));
        }
        break;
    }
  }

  private countUnread(m: Message): void {
    let counted = this.countedUnread.get(m.roomId);
    if (!counted) this.countedUnread.set(m.roomId, (counted = new Set()));
    if (counted.has(m.id)) return;
    counted.add(m.id);
    this.setState((s) => ({ unread: { ...s.unread, [m.roomId]: (s.unread[m.roomId] ?? 0) + 1 } }));
  }

  private markTyping(roomId: string, userId: string): void {
    const key = `${roomId}:${userId}`;
    clearTimeout(this.typingTimers.get(key));
    this.setState((s) => {
      const current = s.typing[roomId] ?? [];
      return current.includes(userId) ? {} : { typing: { ...s.typing, [roomId]: [...current, userId] } };
    });
    this.typingTimers.set(
      key,
      setTimeout(() => {
        this.typingTimers.delete(key);
        this.setState((s) => ({ typing: { ...s.typing, [roomId]: (s.typing[roomId] ?? []).filter((u) => u !== userId) } }));
      }, this.typingTtlMs),
    );
  }
}
