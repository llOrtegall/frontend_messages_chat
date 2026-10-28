import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidPasswordError extends ValidationError {
  readonly code = "auth.invalid_password";

  constructor(reason: string) {
    super(`Invalid password: ${reason}`);
  }
}
