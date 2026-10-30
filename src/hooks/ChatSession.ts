import type { FailedAction } from "../i18n/errorMessages.ts";
import type { ChatModule } from "../modules/chat/application/factory.ts";
import { Chat } from "../modules/chat/domain/Chat.ts";
import type { ChatEffect } from "../modules/chat/domain/ChatEffect.ts";
import type { MessageModule } from "../modules/message/application/factory.ts";
import type { ChatEvent } from "../modules/realtime/domain/ChatEvent.ts";
import type { RoomModule } from "../modules/room/application/factory.ts";
import { RoomId } from "../modules/room/domain/RoomId.ts";
import { UserId } from "../modules/user/domain/UserId.ts";

export type ChatAction = Extract<
  FailedAction,
  | "rooms.load"
  | "messages.load"
  | "message.send"
  | "message.edit"
  | "message.delete"
  | "member.add"
  | "member.remove"
  | "member.change_role"
  | "group.leave"
  | "room.delete"
>;

export interface ChatFailure {
  readonly action: ChatAction;
  readonly cause: unknown;
}

export interface ChatSnapshot {
  readonly chat: Chat;
  /** The last action that failed and why; the view words it. */
  readonly failure: ChatFailure | null;
}

export interface ChatModules {
  readonly chat: ChatModule;
  readonly rooms: RoomModule;
  readonly messages: MessageModule;
}

export interface ChatSessionOptions {
  readonly pageSize?: number;
  readonly typingTtlMs?: number;
  readonly typingThrottleMs?: number;
}

const DEFAULTS = { pageSize: 50, typingTtlMs: 3000, typingThrottleMs: 2000 };

/**
 * The signed-in user's chat while it is on screen: the external store behind useChat. It holds the
 * Chat aggregate, feeds it the realtime events and runs the effects it decides on; every user action
 * is one use case. React-free, so the end-to-end smoke drives it too.
 */
export class ChatSession {
  private snapshot: ChatSnapshot;
  private followed = "";
  private unsubscribers: (() => void)[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly typingSentAt = new Map<string, number>();
  private readonly options: Required<ChatSessionOptions>;

  constructor(
    private readonly currentUserId: string,
    private readonly modules: ChatModules,
    options: ChatSessionOptions = {},
  ) {
    this.snapshot = { chat: Chat.start(UserId.fromPrimitive(currentUserId)), failure: null };
    this.options = { ...DEFAULTS, ...options };
  }

  getSnapshot = (): ChatSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start(): void {
    if (this.unsubscribers.length > 0) return;
    const { chat } = this.modules;
    this.unsubscribers = [
      chat.watchChatEvents((event) => this.handle(event)),
      chat.watchConnection((status) => {
        this.update(this.snapshot.chat.connectionChanged(status));
        if (status === "open") void this.resync();
      }),
    ];
    chat.connectRealtime();
  }

  stop(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    for (const timer of this.typingTimers.values()) clearTimeout(timer);
    this.typingTimers.clear();
    this.modules.chat.followRooms([]);
    this.modules.chat.disconnectRealtime();
  }

  async reloadRooms(): Promise<void> {
    try {
      const rooms = await this.modules.rooms.listRooms();
      // Read the chat after the await: it may have changed while the list was loading.
      this.update(this.snapshot.chat.roomsLoaded(rooms));
    } catch (error) {
      this.fail(error, "rooms.load");
    }
  }

  async selectRoom(roomId: string | null): Promise<void> {
    const id = roomId === null ? null : RoomId.fromPrimitive(roomId);
    this.snapshot = { ...this.snapshot, failure: null };
    this.update(this.snapshot.chat.opened(id));
    if (id === null) return;

    const [room] = await Promise.all([
      // A room that can't be read any more is closed by its room.removed event.
      this.modules.rooms.findRoom(id.toPrimitive()).catch(() => null),
      this.snapshot.chat.historyOf(id) ? Promise.resolve() : this.loadPage(id.toPrimitive(), null),
    ]);
    if (room) this.update(this.snapshot.chat.openRoomLoaded(room));
    this.markRead(id.toPrimitive());
  }

  async loadOlder(roomId: string): Promise<void> {
    const history = this.snapshot.chat.historyOf(RoomId.fromPrimitive(roomId));
    if (!history?.canLoadOlder()) return;
    await this.loadPage(roomId, history.getMessages().oldest()?.getId().toPrimitive() ?? null);
  }

  send(roomId: string, text: string, file?: Blob): Promise<boolean> {
    // Recipients drop my typing indicator when the message arrives: typing again must notify again.
    this.typingSentAt.delete(roomId);
    return this.attempt(() => this.modules.chat.sendMessage({ roomId, text, file }), "message.send");
  }

  edit(messageId: string, text: string): Promise<boolean> {
    return this.attempt(() => this.modules.chat.editMessage({ messageId, text }), "message.edit");
  }

  deleteMessage(messageId: string): Promise<boolean> {
    return this.attempt(() => this.modules.chat.deleteMessage(messageId), "message.delete");
  }

  // Membership changes come back as member.* / room.removed events, which update the chat.
  addMember(roomId: string, userId: string): Promise<boolean> {
    return this.attempt(() => this.modules.rooms.addMember({ roomId, userId }), "member.add");
  }

  removeMember(roomId: string, userId: string): Promise<boolean> {
    return this.attempt(() => this.modules.rooms.removeMember({ roomId, userId }), "member.remove");
  }

  leaveGroup(roomId: string): Promise<boolean> {
    return this.attempt(() => this.modules.rooms.removeMember({ roomId, userId: this.currentUserId }), "group.leave");
  }

  changeMemberRole(roomId: string, userId: string, role: string): Promise<boolean> {
    return this.attempt(() => this.modules.rooms.changeMemberRole({ roomId, userId, role }), "member.change_role");
  }

  deleteRoom(roomId: string): Promise<boolean> {
    return this.attempt(() => this.modules.rooms.deleteRoom(roomId), "room.delete");
  }

  /** Opens (creating if needed) the direct room with a user. Throws on failure. */
  async openDirect(userId: string): Promise<string> {
    const room = await this.modules.rooms.openDirectRoom(userId);
    this.update(this.snapshot.chat.roomJoined(room));
    void this.selectRoom(room.getId().toPrimitive());
    return room.getId().toPrimitive();
  }

  /** Creates a group and opens it. Throws on failure. */
  async createGroup(name: string, memberIds: readonly string[]): Promise<string> {
    const room = await this.modules.rooms.createGroupRoom({ name, memberIds });
    this.update(this.snapshot.chat.roomJoined(room));
    void this.selectRoom(room.getId().toPrimitive());
    return room.getId().toPrimitive();
  }

  /** Throttled: the others' indicator lasts longer than the gap between two notices. */
  notifyTyping(roomId: string): void {
    const now = Date.now();
    if (now - (this.typingSentAt.get(roomId) ?? 0) < this.options.typingThrottleMs) return;
    this.typingSentAt.set(roomId, now);
    this.modules.chat.notifyTyping(roomId);
  }

  dismissFailure(): void {
    this.publish({ ...this.snapshot, failure: null });
  }

  private async resync(): Promise<void> {
    await this.reloadRooms();
    const openRoomId = this.snapshot.chat.getOpenRoomId();
    if (!openRoomId || !this.snapshot.chat.historyOf(openRoomId)) return;
    await this.loadPage(openRoomId.toPrimitive(), null, { isNewest: true });
    this.markRead(openRoomId.toPrimitive());
  }

  private markRead(roomId: string): void {
    const id = RoomId.fromPrimitive(roomId);
    const messageId = this.snapshot.chat.pendingReadMark(id);
    if (!messageId) return;
    this.update(this.snapshot.chat.readMarkSent(id, messageId));
    this.modules.chat.markRoomRead({ roomId, messageId: messageId.toPrimitive() }).catch(() => {
      // Sent again with the next message or reconnect.
      this.update(this.snapshot.chat.readMarkFailed(id, messageId));
    });
  }

  private async loadPage(roomId: string, before: string | null, { isNewest = false } = {}): Promise<void> {
    const id = RoomId.fromPrimitive(roomId);
    const { pageSize } = this.options;
    this.update(this.snapshot.chat.historyRequested(id));
    try {
      const page = await this.modules.messages.listMessages({ roomId, before, limit: pageSize });
      const chat = this.snapshot.chat;
      this.update(isNewest ? chat.newestPageLoaded(id, page) : chat.olderPageLoaded(id, page, pageSize));
    } catch (error) {
      this.update(this.snapshot.chat.historyFailed(id));
      this.fail(error, "messages.load");
    }
  }

  private handle(event: ChatEvent): void {
    const { chat, effects } = this.snapshot.chat.apply(event);
    this.update(chat);
    for (const effect of effects) this.run(effect);
  }

  private run(effect: ChatEffect): void {
    switch (effect.type) {
      case "markRead":
        this.markRead(effect.roomId.toPrimitive());
        break;
      case "reloadRooms":
        void this.reloadRooms();
        break;
      case "typingStarted":
        this.expireTyping(effect.roomId, effect.userId);
        break;
    }
  }

  private expireTyping(roomId: RoomId, userId: UserId): void {
    const timerKey = `${roomId.toPrimitive()}:${userId.toPrimitive()}`;
    clearTimeout(this.typingTimers.get(timerKey));
    this.typingTimers.set(
      timerKey,
      setTimeout(() => {
        this.typingTimers.delete(timerKey);
        this.update(this.snapshot.chat.typingStopped(roomId, userId));
      }, this.options.typingTtlMs),
    );
  }

  private async attempt(operation: () => Promise<unknown>, action: ChatAction): Promise<boolean> {
    try {
      await operation();
      return true;
    } catch (error) {
      this.fail(error, action);
      return false;
    }
  }

  private fail(cause: unknown, action: ChatAction): void {
    this.publish({ ...this.snapshot, failure: { action, cause } });
  }

  private update(chat: Chat): void {
    this.publish({ ...this.snapshot, chat });
    const roomIds = chat.roomIds().map((id) => id.toPrimitive());
    if (roomIds.join() === this.followed) return;
    this.followed = roomIds.join();
    this.modules.chat.followRooms(roomIds);
  }

  private publish(snapshot: ChatSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}
