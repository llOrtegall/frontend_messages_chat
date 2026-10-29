import { describe, expect, it } from "bun:test";
import { faker } from "@faker-js/faker";
import { MessageId } from "../../../message/domain/MessageId.ts";
import { InvalidMessageIdError } from "../../../message/domain/errors/InvalidMessageIdError.ts";
import { InvalidRoomError } from "../../domain/errors/InvalidRoomError.ts";
import { ListedRoom } from "../../domain/ListedRoom.ts";
import { ListedRoomList } from "../../domain/ListedRoomList.ts";
import { MemberRole } from "../../domain/MemberRole.ts";
import { RoomKind } from "../../domain/RoomKind.ts";
import { RoomMemberList } from "../../domain/RoomMemberList.ts";
import { RoomName } from "../../domain/RoomName.ts";
import * as RoomMother from "../helpers/RoomMother.ts";

describe("Room values", () => {
  it("knows the kinds and roles the backend uses, and nothing else", () => {
    expect(RoomKind.create("dm").isDirect()).toBe(true);
    expect(() => RoomKind.create("channel")).toThrow(InvalidRoomError);
    expect(MemberRole.create("admin").canManageMembers()).toBe(true);
    expect(MemberRole.create("member").canManageMembers()).toBe(false);
    expect(() => MemberRole.create("guest")).toThrow(InvalidRoomError);
  });

  it("switches admins and plain members", () => {
    expect(MemberRole.admin().toggled().equals(MemberRole.member())).toBe(true);
    expect(MemberRole.member().toggled().equals(MemberRole.admin())).toBe(true);
  });

  it("trims group names and rejects empty or over-long ones", () => {
    expect(RoomName.create("  Team ").toPrimitive()).toBe("Team");
    expect(() => RoomName.create("  ")).toThrow(InvalidRoomError);
    expect(() => RoomName.create("x".repeat(129))).toThrow(InvalidRoomError);
  });

  it("rejects a member listed twice", () => {
    const member = RoomMother.memberPrimitive();

    expect(() => RoomMemberList.fromPrimitive([member, member])).toThrow(InvalidRoomError);
  });
});

describe("MessageId", () => {
  it("orders ids by when they were sent (UUIDv7)", () => {
    const earlier = MessageId.create("01934a5e-0000-7000-8000-000000000000");
    const later = MessageId.create("01934a5e-0001-7000-8000-000000000000");

    expect(later.isAfter(earlier)).toBe(true);
    expect(earlier.isAfter(later)).toBe(false);
    expect(() => MessageId.create("m1")).toThrow(InvalidMessageIdError);
  });
});

describe("ListedRoom", () => {
  it("survives a primitive round-trip", () => {
    const primitive = RoomMother.listedPrimitive({ peer: { id: faker.string.uuid(), displayName: "Bob", avatarUrl: null }, kind: "dm", name: null });

    expect(ListedRoom.fromPrimitive(primitive).toPrimitive()).toEqual(primitive);
  });

  it("is titled by the other user in a direct room and by its name in a group", () => {
    expect(RoomMother.listed({ kind: "dm", name: null, peer: { id: faker.string.uuid(), displayName: "Bob", avatarUrl: null } }).title()).toBe("Bob");
    expect(RoomMother.listed({ kind: "dm", name: null }).title()).toBeNull();
    expect(RoomMother.listed({ name: "Team" }).title()).toBe("Team");
  });

  it("starts with nothing unread when joined from a push event or a creation", () => {
    expect(ListedRoom.joined(RoomMother.newRoomPrimitive()).toPrimitive()).toMatchObject({ unreadCount: 0, lastReadMessageId: null, mutedUntil: null, peer: null });
  });

  it("rejects a negative unread count", () => {
    expect(() => RoomMother.listed({ unreadCount: -1 })).toThrow(InvalidRoomError);
  });
});

describe("ListedRoomList", () => {
  it("lists the most recently active rooms first, counting creation when there are no messages", () => {
    const old = RoomMother.listed({ lastMessageAt: "2026-11-01T10:00:00.000Z" });
    const fresh = RoomMother.listed({ lastMessageAt: null, createdAt: "2026-11-10T10:00:00.000Z" });
    const busy = RoomMother.listed({ lastMessageAt: "2026-11-12T10:00:00.000Z" });

    const list = ListedRoomList.create([old, fresh, busy]);

    expect(list.map((room) => room.getId())).toEqual([busy.getId(), fresh.getId(), old.getId()]);
  });

  it("rejects the same room twice", () => {
    const room = RoomMother.listed();

    expect(() => ListedRoomList.create([room, room])).toThrow(InvalidRoomError);
  });
});
