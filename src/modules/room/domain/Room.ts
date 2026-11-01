import type { MessageId } from "../../message/domain/MessageId.ts";
import { UserId, type UserIdPrimitive } from "../../user/domain/UserId.ts";
import type { DisplayName } from "../../user/domain/DisplayName.ts";
import { RoomId, type RoomIdPrimitive } from "./RoomId.ts";
import { RoomKind, type RoomKindPrimitive } from "./RoomKind.ts";
import type { RoomMember } from "./RoomMember.ts";
import { RoomMemberList, type RoomMemberListPrimitive } from "./RoomMemberList.ts";
import { RoomName, type RoomNamePrimitive } from "./RoomName.ts";

export interface RoomPrimitive {
  readonly id: RoomIdPrimitive;
  readonly kind: RoomKindPrimitive;
  readonly name: RoomNamePrimitive | null;
  readonly createdBy: UserIdPrimitive | null;
  readonly lastMessageAt: string | null;
  readonly createdAt: string;
  readonly members: RoomMemberListPrimitive;
}

export interface RoomAttributes {
  readonly id: RoomId;
  readonly kind: RoomKind;
  readonly name: RoomName | null;
  readonly createdBy: UserId | null;
  readonly lastMessageAt: Date | null;
  readonly createdAt: Date;
  readonly members: RoomMemberList;
}

/**
 * An open room with its members. The membership rules mirror the backend's, which enforces them:
 * here they only decide what the user is offered.
 */
export class Room {
  private constructor(private readonly attributes: RoomAttributes) {}

  static create(attributes: RoomAttributes): Room {
    return new Room({ ...attributes });
  }

  static fromPrimitive(data: RoomPrimitive): Room {
    return Room.create({
      id: RoomId.fromPrimitive(data.id),
      kind: RoomKind.fromPrimitive(data.kind),
      name: data.name === null ? null : RoomName.fromPrimitive(data.name),
      createdBy: data.createdBy === null ? null : UserId.fromPrimitive(data.createdBy),
      lastMessageAt: data.lastMessageAt === null ? null : new Date(data.lastMessageAt),
      createdAt: new Date(data.createdAt),
      members: RoomMemberList.fromPrimitive(data.members),
    });
  }

  getId(): RoomId {
    return this.attributes.id;
  }

  getName(): RoomName | null {
    return this.attributes.name;
  }

  getMembers(): RoomMemberList {
    return this.attributes.members;
  }

  isGroup(): boolean {
    return this.attributes.kind.isGroup();
  }

  withMember(member: RoomMember): Room {
    return Room.create({ ...this.attributes, members: this.attributes.members.upsert(member) });
  }

  withoutMember(userId: UserId): Room {
    return Room.create({ ...this.attributes, members: this.attributes.members.remove(userId) });
  }

  /** Either member deletes a direct room; only the owner deletes a group. */
  canBeDeletedBy(userId: UserId): boolean {
    return !this.isGroup() || Boolean(this.roleOf(userId)?.isOwner());
  }

  canAddMembers(by: UserId): boolean {
    return this.isGroup() && Boolean(this.roleOf(by)?.canManageMembers());
  }

  /** The owner removes anyone but themselves; admins remove plain members. Leaving is not removing. */
  canRemove(target: RoomMember, by: UserId): boolean {
    if (!this.isGroup() || target.is(by)) return false;
    const role = this.roleOf(by);
    if (role?.isOwner()) return !target.getRole().isOwner();
    return Boolean(role?.isAdmin()) && target.getRole().isPlainMember();
  }

  canChangeRoleOf(target: RoomMember, by: UserId): boolean {
    return this.isGroup() && Boolean(this.roleOf(by)?.isOwner()) && !target.getRole().isOwner();
  }

  /** The owner can't leave (they delete the group instead); direct rooms are deleted, not left. */
  canLeave(userId: UserId): boolean {
    const role = this.roleOf(userId);
    return this.isGroup() && role !== null && !role.isOwner();
  }

  /** Marks how far a member read; nothing changes for someone who isn't a member. */
  withReadMark(userId: UserId, messageId: MessageId): Room {
    const member = this.attributes.members.find(userId);
    return member ? this.withMember(member.readUpTo(messageId)) : this;
  }

  /** In a direct room, the other member; null in groups or once they left. */
  peerOf(me: UserId): RoomMember | null {
    if (this.isGroup()) return null;
    return this.attributes.members.firstOtherThan(me);
  }

  /** The name to show next to someone's messages; null once they left the room. */
  nameOf(userId: UserId): DisplayName | null {
    return this.attributes.members.find(userId)?.getDisplayName() ?? null;
  }

  private roleOf(userId: UserId) {
    return this.attributes.members.roleOf(userId);
  }

  equals(other: Room): boolean {
    return this.attributes.id.equals(other.attributes.id);
  }

  toPrimitive(): RoomPrimitive {
    const { id, kind, name, createdBy, lastMessageAt, createdAt, members } = this.attributes;
    return {
      id: id.toPrimitive(),
      kind: kind.toPrimitive(),
      name: name?.toPrimitive() ?? null,
      createdBy: createdBy?.toPrimitive() ?? null,
      lastMessageAt: lastMessageAt?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
      members: members.toPrimitive(),
    };
  }
}
