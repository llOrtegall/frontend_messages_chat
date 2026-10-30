import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidMessageError extends ValidationError {
  readonly code = "message.invalid";

  constructor(reason: string) {
    super(`Invalid message: ${reason}`);
  }
}
