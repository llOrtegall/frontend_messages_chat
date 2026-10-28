import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidCurrentUserError extends ValidationError {
  readonly code = "session.invalid_user";

  constructor(reason: string) {
    super(`Invalid signed-in user: ${reason}`);
  }
}
