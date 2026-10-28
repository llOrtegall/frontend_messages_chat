import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class AttachmentTooLargeError extends ValidationError {
  readonly code = "attachment.too_large";

  constructor(sizeBytes: number) {
    super(`A file of ${sizeBytes} bytes is over the limit`);
  }
}
