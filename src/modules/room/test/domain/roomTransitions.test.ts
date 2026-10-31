import { describe, expect, it } from "bun:test";
import { ListedRoomList } from "../../domain/ListedRoomList.ts";
import { Room } from "../../domain/Room.ts";
import { RoomMember } from "../../domain/RoomMember.ts";
import * as RoomMother from "../helpers/RoomMother.ts";

describe("ListedRoomList transitions", () => {
  it("upserts, updates and removes rooms, keeping the most active first", () => {
    const [older, newer] = [RoomMother.listed({ lastMessageAt: "2026-11-01T00:00:00.000Z", unreadCount: 0 }), RoomMother.listed({ lastMessageAt: "2026-11-10T00:00:00.000Z", unreadCount: 0 })];
    const list = ListedRoomList.create([older, newer]);

    const touched = list.update(older.getId(), (room) => room.touch(new Date("2026-11-12T00:00:00.000Z")).withUnreadCount(1));

    expect(touched.roomIds()[0]?.equals(older.getId())).toBe(true);
    expect(touched.hasUnread()).toBe(true);
    expect(list.hasUnread()).toBe(false);
    expect(touched.remove(older.getId()).count()).toBe(1);
    expect(list.upsert(older.withUnreadCount(4)).find(older.getId())?.getUnreadCount()).toBe(4);
  });

  it("adds up the unread messages of every room", () => {
    const list = ListedRoomList.create([RoomMother.listed({ unreadCount: 2 }), RoomMother.listed({ unreadCount: 0 }), RoomMother.listed({ unreadCount: 3 })]);

    expect(list.totalUnread()).toBe(5);
    expect(ListedRoomList.empty().totalUnread()).toBe(0);
  });
});

describe("Room membership transitions", () => {
  it("adds, replaces and removes members, leaving the original untouched", () => {
    const room = Room.fromPrimitive(RoomMother.createPrimitive());
    const member = RoomMother.memberPrimitive({ role: "member" });

    const joined = room.withMember(RoomMember.fromPrimitive(member));
    const promoted = joined.withMember(RoomMember.fromPrimitive({ ...member, role: "admin" }));
    const left = promoted.withoutMember(RoomMember.fromPrimitive(member).getUserId());

    expect(joined.getMembers().count()).toBe(2);
    expect(promoted.getMembers().count()).toBe(2);
    expect(promoted.getMembers().roleOf(RoomMember.fromPrimitive(member).getUserId())?.isAdmin()).toBe(true);
    expect(left.getMembers().count()).toBe(1);
    expect(room.getMembers().count()).toBe(1);
  });
});
