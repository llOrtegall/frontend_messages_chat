import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidUserSearchError extends ValidationError {
  readonly code = "user.invalid_search";

  constructor(reason: string) {
    super(`Invalid user search: ${reason}`);
  }
}
