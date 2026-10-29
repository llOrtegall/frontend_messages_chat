import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidRoomError extends ValidationError {
  readonly code = "room.invalid";

  constructor(reason: string) {
    super(`Invalid room: ${reason}`);
  }
}
