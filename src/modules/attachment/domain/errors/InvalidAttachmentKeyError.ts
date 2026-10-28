import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidAttachmentKeyError extends ValidationError {
  readonly code = "attachment.invalid_key";

  constructor(reason: string) {
    super(`Invalid attachment key: ${reason}`);
  }
}
