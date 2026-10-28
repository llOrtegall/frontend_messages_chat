import { ValidationError } from "../../../shared/domain/DomainError.ts";

export class InvalidEmailTokenError extends ValidationError {
  readonly code = "auth.invalid_email_token";

  constructor() {
    super("The emailed token is missing or malformed");
  }
}
