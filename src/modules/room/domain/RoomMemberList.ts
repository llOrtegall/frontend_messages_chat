import type { UserId } from "../../user/domain/UserId.ts";
import { InvalidRoomError } from "./errors/InvalidRoomError.ts";
import type { MemberRole } from "./MemberRole.ts";
import { RoomMember, type RoomMemberPrimitive } from "./RoomMember.ts";

export type RoomMemberListPrimitive = readonly RoomMemberPrimitive[];

export class RoomMemberList {
  private constructor(private readonly members: readonly RoomMember[]) {}

  static create(members: readonly RoomMember[]): RoomMemberList {
    RoomMemberList.ensureHasNoDuplicates(members);
    return new RoomMemberList([...members]);
  }

  static fromPrimitive(data: RoomMemberListPrimitive): RoomMemberList {
    return RoomMemberList.create(data.map(RoomMember.fromPrimitive));
  }

  private static ensureHasNoDuplicates(members: readonly RoomMember[]): void {
    if (members.some((member, index) => members.findIndex((other) => other.equals(member)) !== index)) {
      throw new InvalidRoomError("the same member is listed twice");
    }
  }

  /** Adds the member or replaces the stored version of them (a new role). */
  upsert(member: RoomMember): RoomMemberList {
    const isListed = this.members.some((other) => other.equals(member));
    return RoomMemberList.create(isListed ? this.members.map((other) => (other.equals(member) ? member : other)) : [...this.members, member]);
  }

  remove(userId: UserId): RoomMemberList {
    return RoomMemberList.create(this.members.filter((member) => !member.is(userId)));
  }

  find(userId: UserId): RoomMember | null {
    return this.members.find((member) => member.is(userId)) ?? null;
  }

  firstOtherThan(userId: UserId): RoomMember | null {
    return this.members.find((member) => !member.is(userId)) ?? null;
  }

  roleOf(userId: UserId): MemberRole | null {
    return this.find(userId)?.getRole() ?? null;
  }

  userIds(): UserId[] {
    return this.members.map((member) => member.getUserId());
  }

  map<T>(transform: (member: RoomMember) => T): T[] {
    return this.members.map(transform);
  }

  count(): number {
    return this.members.length;
  }

  equals(other: RoomMemberList): boolean {
    return this.count() === other.count() && this.members.every((member, index) => member.equals(other.members[index]!));
  }

  toPrimitive(): RoomMemberListPrimitive {
    return this.members.map((member) => member.toPrimitive());
  }
}
