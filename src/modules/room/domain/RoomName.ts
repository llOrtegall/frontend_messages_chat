import { InvalidRoomError } from "./errors/InvalidRoomError.ts";

export type RoomNamePrimitive = string;

export class RoomName {
  private static readonly MAX_LENGTH = 128;

  private constructor(private readonly value: string) {}

  static create(value: string): RoomName {
    const trimmed = value.trim();
    RoomName.ensureLengthIsAllowed(trimmed);
    return new RoomName(trimmed);
  }

  static fromPrimitive(data: RoomNamePrimitive): RoomName {
    return RoomName.create(data);
  }

  private static ensureLengthIsAllowed(value: string): void {
    if (value.length === 0 || value.length > RoomName.MAX_LENGTH) {
      throw new InvalidRoomError(`a group name must have between 1 and ${RoomName.MAX_LENGTH} characters`);
    }
  }

  equals(other: RoomName): boolean {
    return this.value === other.value;
  }

  toPrimitive(): RoomNamePrimitive {
    return this.value;
  }
}
