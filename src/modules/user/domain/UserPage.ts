import { UserList, type UserListPrimitive } from "./UserList.ts";
import { UserSearchCursor, type UserSearchCursorPrimitive } from "./UserSearchCursor.ts";

export interface UserPagePrimitive {
  readonly users: UserListPrimitive;
  readonly nextCursor: UserSearchCursorPrimitive | null;
}

export class UserPage {
  private constructor(
    private readonly users: UserList,
    private readonly nextCursor: UserSearchCursor | null,
  ) {}

  static create(users: UserList, nextCursor: UserSearchCursor | null): UserPage {
    return new UserPage(users, nextCursor);
  }

  static fromPrimitive(data: UserPagePrimitive): UserPage {
    return UserPage.create(UserList.fromPrimitive(data.users), data.nextCursor === null ? null : UserSearchCursor.fromPrimitive(data.nextCursor));
  }

  getUsers(): UserList {
    return this.users;
  }

  /** Where the next page starts, or null on the last page. */
  getNextCursor(): UserSearchCursor | null {
    return this.nextCursor;
  }

  hasMore(): boolean {
    return this.nextCursor !== null;
  }

  equals(other: UserPage): boolean {
    return this.users.equals(other.users) && this.toPrimitive().nextCursor === other.toPrimitive().nextCursor;
  }

  toPrimitive(): UserPagePrimitive {
    return { users: this.users.toPrimitive(), nextCursor: this.nextCursor?.toPrimitive() ?? null };
  }
}
