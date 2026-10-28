import { InvalidEmailTokenError } from "./errors/InvalidEmailTokenError.ts";

export type EmailTokenPrimitive = string;

/** The single-use secret in a verification or password-reset link. */
export class EmailToken {
  private static readonly MAX_LENGTH = 512;

  private constructor(private readonly value: string) {}

  static create(value: string): EmailToken {
    EmailToken.ensureIsPresent(value);
    return new EmailToken(value);
  }

  static fromPrimitive(data: EmailTokenPrimitive): EmailToken {
    return EmailToken.create(data);
  }

  private static ensureIsPresent(value: string): void {
    if (value.length === 0 || value.length > EmailToken.MAX_LENGTH) throw new InvalidEmailTokenError();
  }

  equals(other: EmailToken): boolean {
    return this.value === other.value;
  }

  toPrimitive(): EmailTokenPrimitive {
    return this.value;
  }
}
