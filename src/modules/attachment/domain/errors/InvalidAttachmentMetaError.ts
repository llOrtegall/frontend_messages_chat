import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidAttachmentMetaError extends ValidationError {
  readonly code = "attachment.invalid_meta";

  constructor(reason: string) {
    super(`Invalid attachment: ${reason}`);
  }
}
