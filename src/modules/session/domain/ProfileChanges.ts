import { AttachmentKey, type AttachmentKeyPrimitive } from "../../attachment/domain/AttachmentKey.ts";
import { DisplayName, type DisplayNamePrimitive } from "../../user/domain/DisplayName.ts";
import type { CurrentUser } from "./CurrentUser.ts";

export interface ProfileChangesPrimitive {
  readonly displayName?: DisplayNamePrimitive;
  /** null removes the picture. */
  readonly avatarKey?: AttachmentKeyPrimitive | null;
}

export interface WantedProfile {
  readonly displayName: DisplayName;
  /** A newly uploaded picture, null to remove it, undefined to keep it. */
  readonly avatarKey?: AttachmentKey | null;
}

/** What actually differs between the profile the user has and the one they asked for. */
export class ProfileChanges {
  private constructor(
    private readonly displayName: DisplayName | undefined,
    private readonly avatarKey: AttachmentKey | null | undefined,
  ) {}

  static create(displayName: DisplayName | undefined, avatarKey: AttachmentKey | null | undefined): ProfileChanges {
    return new ProfileChanges(displayName, avatarKey);
  }

  static fromPrimitive(data: ProfileChangesPrimitive): ProfileChanges {
    const avatarKey = data.avatarKey === undefined ? undefined : data.avatarKey === null ? null : AttachmentKey.fromPrimitive(data.avatarKey);
    return ProfileChanges.create(data.displayName === undefined ? undefined : DisplayName.fromPrimitive(data.displayName), avatarKey);
  }

  static between(current: CurrentUser, wanted: WantedProfile): ProfileChanges {
    const renamed = current.getDisplayName().equals(wanted.displayName) ? undefined : wanted.displayName;
    const keepsNoPicture = wanted.avatarKey === null && current.getAvatarUrl() === null;
    return ProfileChanges.create(renamed, keepsNoPicture ? undefined : wanted.avatarKey);
  }

  isEmpty(): boolean {
    return this.displayName === undefined && this.avatarKey === undefined;
  }

  equals(other: ProfileChanges): boolean {
    return JSON.stringify(this.toPrimitive()) === JSON.stringify(other.toPrimitive());
  }

  toPrimitive(): ProfileChangesPrimitive {
    return {
      ...(this.displayName && { displayName: this.displayName.toPrimitive() }),
      ...(this.avatarKey !== undefined && { avatarKey: this.avatarKey?.toPrimitive() ?? null }),
    };
  }
}
