import { InvalidUserEmailError } from "./errors/InvalidUserEmailError.ts";

export type UserEmailPrimitive = string;

export class UserEmail {
  private static readonly FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(private readonly value: string) {}

  static create(value: string): UserEmail {
    const normalized = value.trim().toLowerCase();
    UserEmail.ensureFormatIsValid(normalized);
    return new UserEmail(normalized);
  }

  static fromPrimitive(data: UserEmailPrimitive): UserEmail {
    return UserEmail.create(data);
  }

  private static ensureFormatIsValid(value: string): void {
    if (!UserEmail.FORMAT.test(value)) throw new InvalidUserEmailError(value);
  }

  equals(other: UserEmail): boolean {
    return this.value === other.value;
  }

  toPrimitive(): UserEmailPrimitive {
    return this.value;
  }
}
