import { InvalidDisplayNameError } from "./errors/InvalidDisplayNameError.ts";

export type DisplayNamePrimitive = string;

export class DisplayName {
  private static readonly MAX_LENGTH = 64;

  private constructor(private readonly value: string) {}

  static create(value: string): DisplayName {
    const trimmed = value.trim();
    DisplayName.ensureIsNotEmpty(trimmed);
    DisplayName.ensureDoesNotExceedMaxLength(trimmed);
    return new DisplayName(trimmed);
  }

  static fromPrimitive(data: DisplayNamePrimitive): DisplayName {
    return DisplayName.create(data);
  }

  private static ensureIsNotEmpty(value: string): void {
    if (value.length === 0) throw new InvalidDisplayNameError("it cannot be empty");
  }

  private static ensureDoesNotExceedMaxLength(value: string): void {
    if (value.length > DisplayName.MAX_LENGTH) {
      throw new InvalidDisplayNameError(`it cannot exceed ${DisplayName.MAX_LENGTH} characters`);
    }
  }

  equals(other: DisplayName): boolean {
    return this.value === other.value;
  }

  toPrimitive(): DisplayNamePrimitive {
    return this.value;
  }
}
