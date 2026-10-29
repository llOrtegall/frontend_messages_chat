import { InvalidUserError } from "./errors/InvalidUserError.ts";
import { User, type UserPrimitive } from "./User.ts";
import type { UserId } from "./UserId.ts";

export type UserListPrimitive = readonly UserPrimitive[];

export class UserList {
  private constructor(private readonly users: readonly User[]) {}

  static create(users: readonly User[]): UserList {
    UserList.ensureHasNoDuplicates(users);
    return new UserList([...users]);
  }

  static empty(): UserList {
    return UserList.create([]);
  }

  static fromPrimitive(data: UserListPrimitive): UserList {
    return UserList.create(data.map(User.fromPrimitive));
  }

  private static ensureHasNoDuplicates(users: readonly User[]): void {
    if (users.some((user, index) => users.findIndex((other) => other.equals(user)) !== index)) {
      throw new InvalidUserError("the same user is listed twice");
    }
  }

  /** The next page of a search; someone already listed (the directory changed meanwhile) keeps their place. */
  append(page: UserList): UserList {
    return UserList.create([...this.users, ...page.users.filter((user) => !this.includes(user.getId()))]);
  }

  excluding(userIds: readonly UserId[]): UserList {
    return UserList.create(this.users.filter((user) => !userIds.some((id) => user.getId().equals(id))));
  }

  includes(userId: UserId): boolean {
    return this.users.some((user) => user.getId().equals(userId));
  }

  map<T>(transform: (user: User) => T): T[] {
    return this.users.map(transform);
  }

  countWhere(predicate: (user: User) => boolean): number {
    return this.users.filter(predicate).length;
  }

  count(): number {
    return this.users.length;
  }

  isEmpty(): boolean {
    return this.users.length === 0;
  }

  equals(other: UserList): boolean {
    return this.count() === other.count() && this.users.every((user, index) => user.equals(other.users[index]!));
  }

  toPrimitive(): UserListPrimitive {
    return this.users.map((user) => user.toPrimitive());
  }
}
