import { MessageId, type MessageIdPrimitive } from "../../message/domain/MessageId.ts";
import { AvatarUrl, type AvatarUrlPrimitive } from "../../user/domain/AvatarUrl.ts";
import { DisplayName, type DisplayNamePrimitive } from "../../user/domain/DisplayName.ts";
import { UserId, type UserIdPrimitive } from "../../user/domain/UserId.ts";
import { MemberRole, type MemberRolePrimitive } from "./MemberRole.ts";

export interface RoomMemberPrimitive {
  readonly userId: UserIdPrimitive;
  readonly displayName: DisplayNamePrimitive;
  readonly avatarUrl: AvatarUrlPrimitive | null;
  readonly role: MemberRolePrimitive;
  readonly joinedAt: string;
  readonly lastReadMessageId: MessageIdPrimitive | null;
  readonly mutedUntil: string | null;
}

export interface RoomMemberAttributes {
  readonly userId: UserId;
  readonly displayName: DisplayName;
  readonly avatarUrl: AvatarUrl | null;
  readonly role: MemberRole;
  readonly joinedAt: Date;
  readonly lastReadMessageId: MessageId | null;
  readonly mutedUntil: Date | null;
}

const dateOrNull = (iso: string | null): Date | null => (iso === null ? null : new Date(iso));

export class RoomMember {
  private constructor(private readonly attributes: RoomMemberAttributes) {}

  static create(attributes: RoomMemberAttributes): RoomMember {
    return new RoomMember({ ...attributes });
  }

  static fromPrimitive(data: RoomMemberPrimitive): RoomMember {
    return RoomMember.create({
      userId: UserId.fromPrimitive(data.userId),
      displayName: DisplayName.fromPrimitive(data.displayName),
      avatarUrl: data.avatarUrl === null ? null : AvatarUrl.fromPrimitive(data.avatarUrl),
      role: MemberRole.fromPrimitive(data.role),
      joinedAt: new Date(data.joinedAt),
      lastReadMessageId: data.lastReadMessageId === null ? null : MessageId.fromPrimitive(data.lastReadMessageId),
      mutedUntil: dateOrNull(data.mutedUntil),
    });
  }

  getUserId(): UserId {
    return this.attributes.userId;
  }

  getDisplayName(): DisplayName {
    return this.attributes.displayName;
  }

  getAvatarUrl(): AvatarUrl | null {
    return this.attributes.avatarUrl;
  }

  getRole(): MemberRole {
    return this.attributes.role;
  }

  is(userId: UserId): boolean {
    return this.attributes.userId.equals(userId);
  }

  equals(other: RoomMember): boolean {
    return this.is(other.attributes.userId);
  }

  toPrimitive(): RoomMemberPrimitive {
    const { userId, displayName, avatarUrl, role, joinedAt, lastReadMessageId, mutedUntil } = this.attributes;
    return {
      userId: userId.toPrimitive(),
      displayName: displayName.toPrimitive(),
      avatarUrl: avatarUrl?.toPrimitive() ?? null,
      role: role.toPrimitive(),
      joinedAt: joinedAt.toISOString(),
      lastReadMessageId: lastReadMessageId?.toPrimitive() ?? null,
      mutedUntil: mutedUntil?.toISOString() ?? null,
    };
  }
}
