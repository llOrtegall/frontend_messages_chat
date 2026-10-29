import { InvalidRoomError } from "./errors/InvalidRoomError.ts";

const ROLES = ["owner", "admin", "member"] as const;

export type MemberRolePrimitive = (typeof ROLES)[number];

export class MemberRole {
  private constructor(private readonly value: MemberRolePrimitive) {}

  static create(value: string): MemberRole {
    return new MemberRole(MemberRole.ensureIsKnown(value));
  }

  static fromPrimitive(data: MemberRolePrimitive): MemberRole {
    return MemberRole.create(data);
  }

  static admin(): MemberRole {
    return MemberRole.create("admin");
  }

  static member(): MemberRole {
    return MemberRole.create("member");
  }

  private static ensureIsKnown(value: string): MemberRolePrimitive {
    const role = ROLES.find((known) => known === value);
    if (!role) throw new InvalidRoomError(`"${value}" is not a role`);
    return role;
  }

  isOwner(): boolean {
    return this.value === "owner";
  }

  isAdmin(): boolean {
    return this.value === "admin";
  }

  isPlainMember(): boolean {
    return this.value === "member";
  }

  canManageMembers(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  /** What the owner switches a member to: admins become plain members and the other way round. */
  toggled(): MemberRole {
    return this.isAdmin() ? MemberRole.member() : MemberRole.admin();
  }

  equals(other: MemberRole): boolean {
    return this.value === other.value;
  }

  toPrimitive(): MemberRolePrimitive {
    return this.value;
  }
}
