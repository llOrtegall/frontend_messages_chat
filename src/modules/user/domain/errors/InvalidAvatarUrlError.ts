import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidAvatarUrlError extends ValidationError {
  readonly code = "user.invalid_avatar_url";

  constructor(value: string) {
    super(`"${value}" is not an avatar URL`);
  }
}
