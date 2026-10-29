import { InvalidRoomError } from "./errors/InvalidRoomError.ts";

const KINDS = ["dm", "group"] as const;

export type RoomKindPrimitive = (typeof KINDS)[number];

/** A direct room joins exactly two users; a group has a name, an owner and roles. */
export class RoomKind {
  private constructor(private readonly value: RoomKindPrimitive) {}

  static create(value: string): RoomKind {
    return new RoomKind(RoomKind.ensureIsKnown(value));
  }

  static fromPrimitive(data: RoomKindPrimitive): RoomKind {
    return RoomKind.create(data);
  }

  private static ensureIsKnown(value: string): RoomKindPrimitive {
    const kind = KINDS.find((known) => known === value);
    if (!kind) throw new InvalidRoomError(`"${value}" is not a kind of room`);
    return kind;
  }

  isDirect(): boolean {
    return this.value === "dm";
  }

  isGroup(): boolean {
    return this.value === "group";
  }

  equals(other: RoomKind): boolean {
    return this.value === other.value;
  }

  toPrimitive(): RoomKindPrimitive {
    return this.value;
  }
}
