import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidDisplayNameError extends ValidationError {
  readonly code = "user.invalid_display_name";

  constructor(reason: string) {
    super(`Invalid display name: ${reason}`);
  }
}
