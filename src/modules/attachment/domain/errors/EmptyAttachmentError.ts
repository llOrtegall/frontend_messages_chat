import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class EmptyAttachmentError extends ValidationError {
  readonly code = "attachment.empty";

  constructor() {
    super("The file is empty");
  }
}
