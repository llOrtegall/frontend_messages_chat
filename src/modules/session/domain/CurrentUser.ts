import { AvatarUrl, type AvatarUrlPrimitive } from "../../user/domain/AvatarUrl.ts";
import { DisplayName, type DisplayNamePrimitive } from "../../user/domain/DisplayName.ts";
import { UserEmail, type UserEmailPrimitive } from "../../user/domain/UserEmail.ts";
import { UserId, type UserIdPrimitive } from "../../user/domain/UserId.ts";
import { InvalidCurrentUserError } from "./errors/InvalidCurrentUserError.ts";

export interface CurrentUserPrimitive {
  readonly id: UserIdPrimitive;
  readonly email: UserEmailPrimitive;
  readonly displayName: DisplayNamePrimitive;
  readonly avatarUrl: AvatarUrlPrimitive | null;
  readonly emailVerifiedAt: string | null;
}

export interface CurrentUserAttributes {
  readonly id: UserId;
  readonly email: UserEmail;
  readonly displayName: DisplayName;
  readonly avatarUrl: AvatarUrl | null;
  readonly emailVerifiedAt: Date | null;
}

/** The signed-in user, the only one whose email this app knows. */
export class CurrentUser {
  private constructor(
    private readonly id: UserId,
    private readonly email: UserEmail,
    private readonly displayName: DisplayName,
    private readonly avatarUrl: AvatarUrl | null,
    private readonly emailVerifiedAt: Date | null,
  ) {}

  static create({ id, email, displayName, avatarUrl, emailVerifiedAt }: CurrentUserAttributes): CurrentUser {
    CurrentUser.ensureVerificationDateIsValid(emailVerifiedAt);
    return new CurrentUser(id, email, displayName, avatarUrl, emailVerifiedAt && new Date(emailVerifiedAt));
  }

  static fromPrimitive(data: CurrentUserPrimitive): CurrentUser {
    return CurrentUser.create({
      id: UserId.fromPrimitive(data.id),
      email: UserEmail.fromPrimitive(data.email),
      displayName: DisplayName.fromPrimitive(data.displayName),
      avatarUrl: data.avatarUrl === null ? null : AvatarUrl.fromPrimitive(data.avatarUrl),
      emailVerifiedAt: data.emailVerifiedAt === null ? null : new Date(data.emailVerifiedAt),
    });
  }

  private static ensureVerificationDateIsValid(emailVerifiedAt: Date | null): void {
    if (emailVerifiedAt && Number.isNaN(emailVerifiedAt.getTime())) throw new InvalidCurrentUserError("unreadable verification date");
  }

  getId(): UserId {
    return this.id;
  }

  getEmail(): UserEmail {
    return this.email;
  }

  getDisplayName(): DisplayName {
    return this.displayName;
  }

  getAvatarUrl(): AvatarUrl | null {
    return this.avatarUrl;
  }

  isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null;
  }

  markEmailVerified(at: Date): CurrentUser {
    if (this.isEmailVerified()) return this;
    return CurrentUser.create({ ...this.attributes(), emailVerifiedAt: at });
  }

  private attributes(): CurrentUserAttributes {
    return {
      id: this.id,
      email: this.email,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
      emailVerifiedAt: this.emailVerifiedAt,
    };
  }

  equals(other: CurrentUser): boolean {
    return this.id.equals(other.id);
  }

  toPrimitive(): CurrentUserPrimitive {
    return {
      id: this.id.toPrimitive(),
      email: this.email.toPrimitive(),
      displayName: this.displayName.toPrimitive(),
      avatarUrl: this.avatarUrl?.toPrimitive() ?? null,
      emailVerifiedAt: this.emailVerifiedAt?.toISOString() ?? null,
    };
  }
}
