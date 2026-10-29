import { InvalidRoomError } from "./errors/InvalidRoomError.ts";
import { ListedRoom, type ListedRoomPrimitive } from "./ListedRoom.ts";

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
