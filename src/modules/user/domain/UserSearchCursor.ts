import { InvalidUserSearchError } from "./errors/InvalidUserSearchError.ts";

export type UserSearchCursorPrimitive = string;

/** Opaque bookmark the backend hands out to continue a search where the last page ended. */
export class UserSearchCursor {
  private static readonly MAX_LENGTH = 512;

  private constructor(private readonly value: string) {}

  static create(value: string): UserSearchCursor {
    UserSearchCursor.ensureLengthIsAllowed(value);
    return new UserSearchCursor(value);
  }

  static fromPrimitive(data: UserSearchCursorPrimitive): UserSearchCursor {
    return UserSearchCursor.create(data);
  }

  private static ensureLengthIsAllowed(value: string): void {
    if (value.length === 0 || value.length > UserSearchCursor.MAX_LENGTH) throw new InvalidUserSearchError("malformed cursor");
  }

  equals(other: UserSearchCursor): boolean {
    return this.value === other.value;
  }

  toPrimitive(): UserSearchCursorPrimitive {
    return this.value;
  }
}
