import { InvalidPasswordError } from "./errors/InvalidPasswordError.ts";

export type PasswordPrimitive = string;

/** A new password the user chooses (sign-up, reset, change). Passwords typed to sign in are only compared by the backend. */
export class Password {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;

  private constructor(private readonly value: string) {}

  static create(value: string): Password {
    Password.ensureLengthIsAllowed(value);
    return new Password(value);
  }

  static fromPrimitive(data: PasswordPrimitive): Password {
    return Password.create(data);
  }

  private static ensureLengthIsAllowed(value: string): void {
    if (value.length < Password.MIN_LENGTH || value.length > Password.MAX_LENGTH) {
      throw new InvalidPasswordError(`it must have between ${Password.MIN_LENGTH} and ${Password.MAX_LENGTH} characters`);
    }
  }

  equals(other: Password): boolean {
    return this.value === other.value;
  }

  toPrimitive(): PasswordPrimitive {
    return this.value;
  }
}
