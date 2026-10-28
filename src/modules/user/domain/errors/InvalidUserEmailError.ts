import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidUserEmailError extends ValidationError {
  readonly code = "user.invalid_email";

  constructor(value: string) {
    super(`"${value}" is not an email`);
  }
}
