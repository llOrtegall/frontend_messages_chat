import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidUserError extends ValidationError {
  readonly code = "user.invalid";

  constructor(reason: string) {
    super(`Invalid user: ${reason}`);
  }
}
