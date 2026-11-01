import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidActiveSessionError extends ValidationError {
  readonly code = "session.invalid_active_session";

  constructor(reason: string) {
    super(`Invalid active session: ${reason}`);
  }
}
