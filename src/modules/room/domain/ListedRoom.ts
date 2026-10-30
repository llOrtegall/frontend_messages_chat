import { MessageId, type MessageIdPrimitive } from "../../message/domain/MessageId.ts";
import { UserId, type UserIdPrimitive } from "../../user/domain/UserId.ts";
import { InvalidRoomError } from "./errors/InvalidRoomError.ts";
import { RoomId, type RoomIdPrimitive } from "./RoomId.ts";
import { RoomKind, type RoomKindPrimitive } from "./RoomKind.ts";
import { RoomName, type RoomNamePrimitive } from "./RoomName.ts";
import { RoomPeer, type RoomPeerPrimitive } from "./RoomPeer.ts";

export interface ListedRoomPrimitive {
  readonly id: RoomIdPrimitive;
  readonly kind: RoomKindPrimitive;
  readonly name: RoomNamePrimitive | null;
  readonly createdBy: UserIdPrimitive | null;
  readonly lastMessageAt: string | null;
  readonly createdAt: string;
  readonly unreadCount: number;
  readonly lastReadMessageId: MessageIdPrimitive | null;
  readonly mutedUntil: string | null;
  readonly peer: RoomPeerPrimitive | null;
}

/** A room created elsewhere, as push events and creation responses carry it: no read state, no peer. */
export type NewRoomPrimitive = Omit<ListedRoomPrimitive, "unreadCount" | "lastReadMessageId" | "mutedUntil" | "peer">;

export interface ListedRoomAttributes {
  readonly id: RoomId;
  readonly kind: RoomKind;
  readonly name: RoomName | null;
  readonly createdBy: UserId | null;
  readonly lastMessageAt: Date | null;
  readonly createdAt: Date;
  readonly unreadCount: number;
  readonly lastReadMessageId: MessageId | null;
  readonly mutedUntil: Date | null;
  readonly peer: RoomPeer | null;
}

const dateOrNull = (iso: string | null): Date | null => (iso === null ? null : new Date(iso));

/** A room in the user's list, with their own read state. */
export class ListedRoom {
  private constructor(private readonly attributes: ListedRoomAttributes) {}

  static create(attributes: ListedRoomAttributes): ListedRoom {
    ListedRoom.ensureUnreadCountIsValid(attributes.unreadCount);
    return new ListedRoom({ ...attributes });
  }

  static fromPrimitive(data: ListedRoomPrimitive): ListedRoom {
    return ListedRoom.create({
      id: RoomId.fromPrimitive(data.id),
      kind: RoomKind.fromPrimitive(data.kind),
      name: data.name === null ? null : RoomName.fromPrimitive(data.name),
      createdBy: data.createdBy === null ? null : UserId.fromPrimitive(data.createdBy),
      lastMessageAt: dateOrNull(data.lastMessageAt),
      createdAt: new Date(data.createdAt),
      unreadCount: data.unreadCount,
      lastReadMessageId: data.lastReadMessageId === null ? null : MessageId.fromPrimitive(data.lastReadMessageId),
      mutedUntil: dateOrNull(data.mutedUntil),
      peer: data.peer === null ? null : RoomPeer.fromPrimitive(data.peer),
    });
  }

  static joined(room: NewRoomPrimitive): ListedRoom {
    return ListedRoom.fromPrimitive({ ...room, unreadCount: 0, lastReadMessageId: null, mutedUntil: null, peer: null });
  }

  private static ensureUnreadCountIsValid(count: number): void {
    if (!Number.isInteger(count) || count < 0) throw new InvalidRoomError(`${count} is not an unread count`);
  }

  getId(): RoomId {
    return this.attributes.id;
  }

  /** The other user's name for a direct room, the group's name otherwise; null when neither is known yet. */
  title(): string | null {
    const { kind, peer, name } = this.attributes;
    const peerName = kind.isDirect() ? peer?.getDisplayName().toPrimitive() : undefined;
    return peerName ?? name?.toPrimitive() ?? null;
  }

  isGroup(): boolean {
    return this.attributes.kind.isGroup();
  }

  isDirect(): boolean {
    return this.attributes.kind.isDirect();
  }

  getUnreadCount(): number {
    return this.attributes.unreadCount;
  }

  getLastMessageAt(): Date | null {
    return this.attributes.lastMessageAt;
  }

  withUnreadCount(unreadCount: number): ListedRoom {
    return ListedRoom.create({ ...this.attributes, unreadCount });
  }

  /** A message arrived at `at`: the room moves up the list. */
  touch(at: Date): ListedRoom {
    return ListedRoom.create({ ...this.attributes, lastMessageAt: at });
  }

  lastActivity(): Date {
    return this.attributes.lastMessageAt ?? this.attributes.createdAt;
  }

  equals(other: ListedRoom): boolean {
    return this.attributes.id.equals(other.attributes.id);
  }

  toPrimitive(): ListedRoomPrimitive {
    const { id, kind, name, createdBy, lastMessageAt, createdAt, unreadCount, lastReadMessageId, mutedUntil, peer } = this.attributes;
    return {
      id: id.toPrimitive(),
      kind: kind.toPrimitive(),
      name: name?.toPrimitive() ?? null,
      createdBy: createdBy?.toPrimitive() ?? null,
      lastMessageAt: lastMessageAt?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
      unreadCount,
      lastReadMessageId: lastReadMessageId?.toPrimitive() ?? null,
      mutedUntil: mutedUntil?.toISOString() ?? null,
      peer: peer?.toPrimitive() ?? null,
    };
  }
}
