import { InvalidRoomError } from "./errors/InvalidRoomError.ts";
import { ListedRoom, type ListedRoomPrimitive } from "./ListedRoom.ts";
import type { RoomId } from "./RoomId.ts";

export type ListedRoomListPrimitive = readonly ListedRoomPrimitive[];

/** The user's rooms, the most recently active first. */
export class ListedRoomList {
  private constructor(private readonly rooms: readonly ListedRoom[]) {}

  static create(rooms: readonly ListedRoom[]): ListedRoomList {
    ListedRoomList.ensureHasNoDuplicates(rooms);
    return new ListedRoomList([...rooms].sort((a, b) => b.lastActivity().getTime() - a.lastActivity().getTime()));
  }

  static empty(): ListedRoomList {
    return ListedRoomList.create([]);
  }

  static fromPrimitive(data: ListedRoomListPrimitive): ListedRoomList {
    return ListedRoomList.create(data.map(ListedRoom.fromPrimitive));
  }

  private static ensureHasNoDuplicates(rooms: readonly ListedRoom[]): void {
    if (rooms.some((room, index) => rooms.findIndex((other) => other.equals(room)) !== index)) {
      throw new InvalidRoomError("the same room is listed twice");
    }
  }

  find(id: RoomId): ListedRoom | null {
    return this.rooms.find((room) => room.getId().equals(id)) ?? null;
  }

  /** Adds the room or replaces the stored version of it. */
  upsert(room: ListedRoom): ListedRoomList {
    return ListedRoomList.create([...this.rooms.filter((other) => !other.equals(room)), room]);
  }

  /** Changes one room; does nothing when it is not listed. */
  update(id: RoomId, change: (room: ListedRoom) => ListedRoom): ListedRoomList {
    return ListedRoomList.create(this.rooms.map((room) => (room.getId().equals(id) ? change(room) : room)));
  }

  remove(id: RoomId): ListedRoomList {
    return ListedRoomList.create(this.rooms.filter((room) => !room.getId().equals(id)));
  }

  roomIds(): RoomId[] {
    return this.rooms.map((room) => room.getId());
  }

  totalUnread(): number {
    return this.rooms.reduce((total, room) => total + room.getUnreadCount(), 0);
  }

  hasUnread(): boolean {
    return this.rooms.some((room) => room.getUnreadCount() > 0);
  }

  isEmpty(): boolean {
    return this.rooms.length === 0;
  }

  count(): number {
    return this.rooms.length;
  }

  map<T>(transform: (room: ListedRoom) => T): T[] {
    return this.rooms.map(transform);
  }

  equals(other: ListedRoomList): boolean {
    return this.count() === other.count() && this.rooms.every((room, index) => room.equals(other.rooms[index]!));
  }

  toPrimitive(): ListedRoomListPrimitive {
    return this.rooms.map((room) => room.toPrimitive());
  }
}
