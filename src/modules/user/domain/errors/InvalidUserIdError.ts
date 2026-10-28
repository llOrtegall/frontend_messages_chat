import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidUserIdError extends ValidationError {
  readonly code = "user.invalid_id";

  constructor(value: string) {
    super(`"${value}" is not a user id`);
  }
}
