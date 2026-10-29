import { InvalidUserSearchError } from "./errors/InvalidUserSearchError.ts";
import { UserSearchCursor, type UserSearchCursorPrimitive } from "./UserSearchCursor.ts";

export interface UserSearchPrimitive {
  /** A part of a display name or an exact email; empty lists everyone. */
  readonly query: string;
  readonly cursor: UserSearchCursorPrimitive | null;
}

export class UserSearch {
  private static readonly MAX_QUERY_LENGTH = 100;

  private constructor(
    private readonly query: string,
    private readonly cursor: UserSearchCursor | null,
  ) {}

  static create(query: string, cursor: UserSearchCursor | null): UserSearch {
    const trimmed = query.trim();
    UserSearch.ensureQueryIsNotTooLong(trimmed);
    return new UserSearch(trimmed, cursor);
  }

  static fromPrimitive(data: UserSearchPrimitive): UserSearch {
    return UserSearch.create(data.query, data.cursor === null ? null : UserSearchCursor.fromPrimitive(data.cursor));
  }

  private static ensureQueryIsNotTooLong(query: string): void {
    if (query.length > UserSearch.MAX_QUERY_LENGTH) {
      throw new InvalidUserSearchError(`the query cannot exceed ${UserSearch.MAX_QUERY_LENGTH} characters`);
    }
  }

  equals(other: UserSearch): boolean {
    const { query, cursor } = other.toPrimitive();
    return this.query === query && (this.cursor?.toPrimitive() ?? null) === cursor;
  }

  toPrimitive(): UserSearchPrimitive {
    return { query: this.query, cursor: this.cursor?.toPrimitive() ?? null };
  }
}
