import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class AttachmentTypeNotAllowedError extends ValidationError {
  readonly code = "attachment.type_not_allowed";

  constructor(contentType: string) {
    super(`Files of type "${contentType}" are not allowed`);
  }
}
