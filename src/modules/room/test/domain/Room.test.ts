import { describe, expect, it } from "bun:test";
import * as UserIdMother from "../../../user/test/helpers/UserIdMother.ts";
import { Room } from "../../domain/Room.ts";
import * as RoomMother from "../helpers/RoomMother.ts";

describe("Room", () => {
  describe("Basic behaviour", () => {
    it("survives a primitive round-trip", () => {
      const primitive = RoomMother.createPrimitive({ members: [RoomMother.memberPrimitive({ role: "owner", mutedUntil: new Date().toISOString() })] });

      expect(Room.fromPrimitive(primitive).toPrimitive()).toEqual(primitive);
    });

    it("names who wrote a message, or nobody once they left", () => {
      const { room, admin } = RoomMother.group();

      expect(room.nameOf(admin.getUserId())?.equals(admin.getDisplayName())).toBe(true);
      expect(room.nameOf(UserIdMother.create())).toBeNull();
    });
  });

  describe("Membership rules (mirroring the backend)", () => {
    it("lets the owner and admins add members, not plain members", () => {
      const { room, owner, admin, plain } = RoomMother.group();

      expect([owner, admin, plain].map((member) => room.canAddMembers(member.getUserId()))).toEqual([true, true, false]);
    });

    it("lets the owner remove anyone but themselves, and admins only plain members", () => {
      const { room, owner, admin, otherAdmin, plain } = RoomMother.group();

      expect(room.canRemove(admin, owner.getUserId())).toBe(true);
      expect(room.canRemove(owner, owner.getUserId())).toBe(false);
      expect(room.canRemove(plain, admin.getUserId())).toBe(true);
      expect(room.canRemove(otherAdmin, admin.getUserId())).toBe(false);
      expect(room.canRemove(admin, plain.getUserId())).toBe(false);
    });

    it("lets only the owner change roles, never their own", () => {
      const { room, owner, admin, plain } = RoomMother.group();

      expect(room.canChangeRoleOf(plain, owner.getUserId())).toBe(true);
      expect(room.canChangeRoleOf(plain, admin.getUserId())).toBe(false);
      expect(room.canChangeRoleOf(owner, owner.getUserId())).toBe(false);
    });

    it("keeps the owner in the group: they delete it instead of leaving", () => {
      const { room, owner, admin, plain } = RoomMother.group();

      expect([owner, admin, plain].map((member) => room.canLeave(member.getUserId()))).toEqual([false, true, true]);
      expect([owner, admin].map((member) => room.canBeDeletedBy(member.getUserId()))).toEqual([true, false]);
      expect(room.canLeave(UserIdMother.create())).toBe(false);
    });

    it("has no membership management in a direct room, which either member deletes", () => {
      const { room, me, other } = RoomMother.direct();
      const otherMember = room.getMembers().find(other)!;

      expect(room.canLeave(me) || room.canAddMembers(me) || room.canRemove(otherMember, me)).toBe(false);
      expect(room.canBeDeletedBy(me) && room.canBeDeletedBy(other)).toBe(true);
    });
  });
});
