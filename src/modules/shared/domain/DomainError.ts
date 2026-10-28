/** Every failure the app can explain to the user. `code` is stable and keys the message dictionary. */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export abstract class ValidationError extends DomainError {}
export abstract class UnauthorizedError extends DomainError {}
export abstract class ForbiddenError extends DomainError {}
export abstract class NotFoundError extends DomainError {}
export abstract class ConflictError extends DomainError {}
