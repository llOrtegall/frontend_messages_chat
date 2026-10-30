import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class EmptyMessageError extends ValidationError {
  readonly code = "message.empty";

  constructor() {
    super("A message needs a text or a file");
  }
}
