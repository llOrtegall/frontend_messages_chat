import type { ClientMessageId } from "../../message/domain/ClientMessageId.ts";
import type { Message } from "../../message/domain/Message.ts";
import type { MessageDraft } from "../../message/domain/MessageDraft.ts";
import type { MessageId } from "../../message/domain/MessageId.ts";
import type { MessageList } from "../../message/domain/MessageList.ts";
import { OutgoingMessage } from "../../message/domain/OutgoingMessage.ts";
import { OutgoingMessageList } from "../../message/domain/OutgoingMessageList.ts";
import type { ChatEvent } from "../../realtime/domain/ChatEvent.ts";
import type { ConnectionStatus } from "../../realtime/domain/ConnectionStatus.ts";
import type { ListedRoom } from "../../room/domain/ListedRoom.ts";
import { ListedRoomList } from "../../room/domain/ListedRoomList.ts";
import type { Room } from "../../room/domain/Room.ts";
import type { RoomId } from "../../room/domain/RoomId.ts";
import type { UserId } from "../../user/domain/UserId.ts";
import type { ChatEffect } from "./ChatEffect.ts";
import { RoomHistory } from "./RoomHistory.ts";

interface ChatAttributes {
  readonly me: UserId;
  readonly connection: ConnectionStatus;
  readonly rooms: ListedRoomList | null;
  readonly openRoomId: RoomId | null;
  readonly openRoom: Room | null;
  /** Loaded messages per room id. Rooms never opened have none. */
  readonly histories: ReadonlyMap<string, RoomHistory>;
  readonly typists: ReadonlyMap<string, readonly UserId[]>;
  readonly presence: ReadonlyMap<string, boolean>;
  /** Newest message counted as unread per room since the server's count, so a repeated event counts once. */
  readonly countedUnread: ReadonlyMap<string, MessageId>;
  /** Last message acknowledged with a read mark per room, so the same one isn't sent twice. */
  readonly readMarks: ReadonlyMap<string, MessageId>;
  readonly outbox: OutgoingMessageList;
}

export interface ChatTransition {
  readonly chat: Chat;
  readonly effects: readonly ChatEffect[];
}

const key = (id: RoomId | UserId) => id.toPrimitive();
const withEntry = <V>(map: ReadonlyMap<string, V>, entryKey: string, value: V) => new Map(map).set(entryKey, value);
const withoutEntry = <V>(map: ReadonlyMap<string, V>, entryKey: string) => {
  const copy = new Map(map);
  copy.delete(entryKey);
  return copy;
};

/**
 * Everything the signed-in user sees of their conversations, kept current by applying each realtime
 * event. Events missed while offline are not replayed: on every reconnect the rooms are reloaded.
 */
export class Chat {
  private constructor(private readonly attributes: ChatAttributes) {}

  static start(me: UserId): Chat {
    return new Chat({
      me,
      connection: "closed",
      rooms: null,
      openRoomId: null,
      openRoom: null,
      histories: new Map(),
      typists: new Map(),
      presence: new Map(),
      countedUnread: new Map(),
      readMarks: new Map(),
      outbox: OutgoingMessageList.empty(),
    });
  }

  private with(changes: Partial<ChatAttributes>): Chat {
    return new Chat({ ...this.attributes, ...changes });
  }

  getConnection(): ConnectionStatus {
    return this.attributes.connection;
  }

  isConnected(): boolean {
    return this.attributes.connection === "open";
  }

  /** Null until the first load. */
  getRooms(): ListedRoomList | null {
    return this.attributes.rooms;
  }

  getOpenRoomId(): RoomId | null {
    return this.attributes.openRoomId;
  }

  /** The open room with its members; null while it loads. */
  getOpenRoom(): Room | null {
    return this.attributes.openRoom;
  }

  historyOf(roomId: RoomId): RoomHistory | null {
    return this.attributes.histories.get(key(roomId)) ?? null;
  }

  typistsIn(roomId: RoomId): readonly UserId[] {
    return this.attributes.typists.get(key(roomId)) ?? [];
  }

  /** Live presence once an event said so, what the directory said otherwise. */
  isOnline(userId: UserId, whenUnknown: boolean): boolean {
    return this.attributes.presence.get(key(userId)) ?? whenUnknown;
  }

  roomIds(): RoomId[] {
    return this.attributes.rooms?.roomIds() ?? [];
  }

  outgoingIn(roomId: RoomId): OutgoingMessageList {
    return this.attributes.outbox.inRoom(roomId);
  }

  findOutgoing(id: ClientMessageId): OutgoingMessage | null {
    return this.attributes.outbox.find(id);
  }

  /** What to send again once the channel is back: the backend stores a repeated client id only once. */
  undelivered(): OutgoingMessageList {
    return this.attributes.outbox.failed();
  }

  messageSending(draft: MessageDraft): Chat {
    return this.with({ outbox: this.attributes.outbox.upsert(OutgoingMessage.sending(draft)) });
  }

  /** Its message.created event puts it in the room's history. */
  messageSent(id: ClientMessageId): Chat {
    return this.with({ outbox: this.attributes.outbox.remove(id) });
  }

  messageNotSent(id: ClientMessageId): Chat {
    return this.with({ outbox: this.attributes.outbox.update(id, (message) => message.failed()) });
  }

  messageDiscarded(id: ClientMessageId): Chat {
    return this.with({ outbox: this.attributes.outbox.remove(id) });
  }

  connectionChanged(connection: ConnectionStatus): Chat {
    return this.with({ connection });
  }

  /** The server's unread counts replace ours; the open room is being read right now. */
  roomsLoaded(rooms: ListedRoomList): Chat {
    const openRoomId = this.attributes.openRoomId;
    const read = openRoomId ? rooms.update(openRoomId, (room) => room.withUnreadCount(0)) : rooms;
    return this.with({ rooms: read, countedUnread: new Map() });
  }

  roomJoined(room: ListedRoom): Chat {
    return this.with({ rooms: (this.attributes.rooms ?? ListedRoomList.empty()).upsert(room) });
  }

  opened(roomId: RoomId | null): Chat {
    const rooms = roomId ? this.attributes.rooms?.update(roomId, (room) => room.withUnreadCount(0)) : this.attributes.rooms;
    const countedUnread = roomId ? withoutEntry(this.attributes.countedUnread, key(roomId)) : this.attributes.countedUnread;
    return this.with({ openRoomId: roomId, openRoom: null, rooms: rooms ?? null, countedUnread });
  }

  openRoomLoaded(room: Room): Chat {
    const isStillOpen = this.attributes.openRoomId?.equals(room.getId()) ?? false;
    return isStillOpen ? this.with({ openRoom: room }) : this;
  }

  historyRequested(roomId: RoomId): Chat {
    return this.withHistory(roomId, (history) => history.loadingStarted());
  }

  olderPageLoaded(roomId: RoomId, page: MessageList, pageSize: number): Chat {
    return this.withHistory(roomId, (history) => history.olderPageLoaded(page, pageSize));
  }

  newestPageLoaded(roomId: RoomId, page: MessageList): Chat {
    return this.withHistory(roomId, (history) => history.newestPageLoaded(page));
  }

  historyFailed(roomId: RoomId): Chat {
    return this.withHistory(roomId, (history) => history.loadingFailed());
  }

  /**
   * The message to acknowledge as read in an open room: its newest one, unless that was already sent
   * or the channel is down (the next reconnect reads it again).
   */
  pendingReadMark(roomId: RoomId): MessageId | null {
    const newest = this.historyOf(roomId)?.getMessages().newest()?.getId() ?? null;
    const sent = this.attributes.readMarks.get(key(roomId));
    if (!newest || !this.isConnected() || (sent && !newest.isAfter(sent))) return null;
    return newest;
  }

  readMarkSent(roomId: RoomId, messageId: MessageId): Chat {
    return this.with({ readMarks: withEntry(this.attributes.readMarks, key(roomId), messageId) });
  }

  /** Lets the same mark be sent again next time. */
  readMarkFailed(roomId: RoomId, messageId: MessageId): Chat {
    const isLastSent = this.attributes.readMarks.get(key(roomId))?.equals(messageId) ?? false;
    return isLastSent ? this.with({ readMarks: withoutEntry(this.attributes.readMarks, key(roomId)) }) : this;
  }

  typingStarted(roomId: RoomId, userId: UserId): Chat {
    const current = this.typistsIn(roomId);
    if (current.some((typist) => typist.equals(userId))) return this;
    return this.with({ typists: withEntry(this.attributes.typists, key(roomId), [...current, userId]) });
  }

  typingStopped(roomId: RoomId, userId: UserId): Chat {
    const remaining = this.typistsIn(roomId).filter((typist) => !typist.equals(userId));
    return this.with({ typists: withEntry(this.attributes.typists, key(roomId), remaining) });
  }

  apply(event: ChatEvent): ChatTransition {
    switch (event.type) {
      case "message.created":
        return this.messageArrived(event.message);
      case "message.edited":
        return this.unchanged(this.loadedOnly(event.message.getRoomId(), (history) => history.withMessage(event.message)));
      case "message.deleted":
        return this.unchanged(this.loadedOnly(event.roomId, (history) => history.withoutMessage(event.messageId)));
      case "user.typing":
        return event.userId.equals(this.attributes.me)
          ? this.unchanged(this)
          : { chat: this.typingStarted(event.roomId, event.userId), effects: [{ type: "typingStarted", roomId: event.roomId, userId: event.userId }] };
      case "presence.changed":
        return this.unchanged(this.with({ presence: withEntry(this.attributes.presence, key(event.userId), event.isOnline) }));
      case "message.read":
        return this.unchanged(event.userId.equals(this.attributes.me) ? this.readElsewhere(event.roomId) : this);
      case "room.added":
        // A direct room is titled after the other member, whom only the room list carries.
        return { chat: this.roomJoined(event.room), effects: event.room.isDirect() ? [{ type: "reloadRooms" }] : [] };
      case "room.removed":
        return this.unchanged(this.roomLeft(event.roomId));
      case "member.joined":
      case "member.updated":
        return this.unchanged(this.withOpenRoom(event.roomId, (room) => room.withMember(event.member)));
      case "member.left":
        return this.unchanged(this.withOpenRoom(event.roomId, (room) => room.withoutMember(event.userId)));
    }
  }

  private messageArrived(message: Message): ChatTransition {
    const roomId = message.getRoomId();
    const chat = this.loadedOnly(roomId, (history) => history.withMessage(message))
      .touched(roomId, message.getCreatedAt())
      .typingStopped(roomId, message.getSenderId());
    if (message.isFrom(this.attributes.me)) return this.unchanged(chat);
    const isOpen = this.attributes.openRoomId?.equals(roomId) ?? false;
    return isOpen ? { chat, effects: [{ type: "markRead", roomId }] } : this.unchanged(chat.countedAsUnread(roomId, message.getId()));
  }

  private touched(roomId: RoomId, at: Date): Chat {
    return this.with({ rooms: this.attributes.rooms?.update(roomId, (room) => room.touch(at)) ?? null });
  }

  private countedAsUnread(roomId: RoomId, messageId: MessageId): Chat {
    const counted = this.attributes.countedUnread.get(key(roomId));
    if (counted && !messageId.isAfter(counted)) return this;
    return this.with({
      rooms: this.attributes.rooms?.update(roomId, (room) => room.withUnreadCount(room.getUnreadCount() + 1)) ?? null,
      countedUnread: withEntry(this.attributes.countedUnread, key(roomId), messageId),
    });
  }

  private readElsewhere(roomId: RoomId): Chat {
    return this.with({
      rooms: this.attributes.rooms?.update(roomId, (room) => room.withUnreadCount(0)) ?? null,
      countedUnread: withoutEntry(this.attributes.countedUnread, key(roomId)),
    });
  }

  private roomLeft(roomId: RoomId): Chat {
    const wasOpen = this.attributes.openRoomId?.equals(roomId) ?? false;
    return this.with({
      rooms: this.attributes.rooms?.remove(roomId) ?? null,
      histories: withoutEntry(this.attributes.histories, key(roomId)),
      countedUnread: withoutEntry(this.attributes.countedUnread, key(roomId)),
      outbox: this.attributes.outbox.withoutRoom(roomId),
      ...(wasOpen && { openRoomId: null, openRoom: null }),
    });
  }

  private withOpenRoom(roomId: RoomId, change: (room: Room) => Room): Chat {
    const room = this.attributes.openRoom;
    return room?.getId().equals(roomId) ? this.with({ openRoom: change(room) }) : this;
  }

  private withHistory(roomId: RoomId, change: (history: RoomHistory) => RoomHistory): Chat {
    const history = this.historyOf(roomId) ?? RoomHistory.empty();
    return this.with({ histories: withEntry(this.attributes.histories, key(roomId), change(history)) });
  }

  /** Changes a room's history only if it was ever loaded: a room never opened loads it fresh. */
  private loadedOnly(roomId: RoomId, change: (history: RoomHistory) => RoomHistory): Chat {
    return this.historyOf(roomId) ? this.withHistory(roomId, change) : this;
  }

  private unchanged(chat: Chat): ChatTransition {
    return { chat, effects: [] };
  }

  /** One chat per signed-in user. */
  equals(other: Chat): boolean {
    return this.attributes.me.equals(other.attributes.me);
  }
}
