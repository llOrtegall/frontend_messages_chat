import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidMessageIdError extends ValidationError {
  readonly code = "message.invalid_id";

  constructor(value: string) {
    super(`"${value}" is not a message id`);
  }
}
