import { isUuid } from "../../shared/domain/Uuid.ts";
import { InvalidRoomError } from "./errors/InvalidRoomError.ts";

export type RoomIdPrimitive = string;

export class RoomId {
  private constructor(private readonly value: string) {}

  static create(value: string): RoomId {
    RoomId.ensureIsUuid(value);
    return new RoomId(value);
  }

  static fromPrimitive(data: RoomIdPrimitive): RoomId {
    return RoomId.create(data);
  }

  private static ensureIsUuid(value: string): void {
    if (!isUuid(value)) throw new InvalidRoomError(`"${value}" is not a room id`);
  }

  equals(other: RoomId): boolean {
    return this.value === other.value;
  }

  toPrimitive(): RoomIdPrimitive {
    return this.value;
  }
}
