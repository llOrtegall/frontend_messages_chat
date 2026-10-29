import { AvatarUrl, type AvatarUrlPrimitive } from "./AvatarUrl.ts";
import { DisplayName, type DisplayNamePrimitive } from "./DisplayName.ts";
import { UserId, type UserIdPrimitive } from "./UserId.ts";

export interface UserPrimitive {
  readonly id: UserIdPrimitive;
  readonly displayName: DisplayNamePrimitive;
  readonly avatarUrl: AvatarUrlPrimitive | null;
  readonly isOnline: boolean;
}

export interface UserAttributes {
  readonly id: UserId;
  readonly displayName: DisplayName;
  readonly avatarUrl: AvatarUrl | null;
  readonly isOnline: boolean;
}

/** Someone else as the user directory shows them: never their email. */
export class User {
  private constructor(
    private readonly id: UserId,
    private readonly displayName: DisplayName,
    private readonly avatarUrl: AvatarUrl | null,
    private readonly online: boolean,
  ) {}

  static create({ id, displayName, avatarUrl, isOnline }: UserAttributes): User {
    return new User(id, displayName, avatarUrl, isOnline);
  }

  static fromPrimitive(data: UserPrimitive): User {
    return User.create({
      id: UserId.fromPrimitive(data.id),
      displayName: DisplayName.fromPrimitive(data.displayName),
      avatarUrl: data.avatarUrl === null ? null : AvatarUrl.fromPrimitive(data.avatarUrl),
      isOnline: data.isOnline,
    });
  }

  getId(): UserId {
    return this.id;
  }

  getDisplayName(): DisplayName {
    return this.displayName;
  }

  getAvatarUrl(): AvatarUrl | null {
    return this.avatarUrl;
  }

  /** Whether they were connected when the directory was read; live presence comes from the realtime channel. */
  isOnline(): boolean {
    return this.online;
  }

  equals(other: User): boolean {
    return this.id.equals(other.id);
  }

  toPrimitive(): UserPrimitive {
    return {
      id: this.id.toPrimitive(),
      displayName: this.displayName.toPrimitive(),
      avatarUrl: this.avatarUrl?.toPrimitive() ?? null,
      isOnline: this.online,
    };
  }
}
