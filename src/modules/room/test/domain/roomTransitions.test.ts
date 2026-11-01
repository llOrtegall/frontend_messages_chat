import { describe, expect, it } from "bun:test";
import { ListedRoomList } from "../../domain/ListedRoomList.ts";
import { Room } from "../../domain/Room.ts";
import { RoomMember } from "../../domain/RoomMember.ts";
import { MessageId } from "../../../message/domain/MessageId.ts";
import * as MessageMother from "../../../message/test/helpers/MessageMother.ts";
import * as RoomMother from "../helpers/RoomMother.ts";

describe("ListedRoomList transitions", () => {
  it("upserts, updates and removes rooms, keeping the most active first", () => {
    const [older, newer] = [RoomMother.listed({ lastMessageAt: "2026-11-01T00:00:00.000Z", unreadCount: 0 }), RoomMother.listed({ lastMessageAt: "2026-11-10T00:00:00.000Z", unreadCount: 0 })];
    const list = ListedRoomList.create([older, newer]);

    const touched = list.update(older.getId(), (room) => room.touch(new Date("2026-11-12T00:00:00.000Z")).withUnreadCount(1));

    expect(touched.roomIds()[0]?.equals(older.getId())).toBe(true);
    expect(touched.hasUnreadAt(new Date())).toBe(true);
    expect(list.hasUnreadAt(new Date())).toBe(false);
    expect(touched.remove(older.getId()).count()).toBe(1);
    expect(list.upsert(older.withUnreadCount(4)).find(older.getId())?.getUnreadCount()).toBe(4);
  });

  it("adds up the unread messages of every room that isn't muted", () => {
    const now = new Date("2026-11-14T12:00:00.000Z");
    const muted = RoomMother.listed({ unreadCount: 7, mutedUntil: "2026-11-14T13:00:00.000Z" });
    const muteOver = RoomMother.listed({ unreadCount: 1, mutedUntil: "2026-11-14T11:00:00.000Z" });
    const list = ListedRoomList.create([RoomMother.listed({ unreadCount: 2 }), RoomMother.listed({ unreadCount: 0 }), muted, muteOver]);

    expect(list.totalUnreadAt(now)).toBe(3);
    expect(ListedRoomList.create([muted]).hasUnreadAt(now)).toBe(false);
    expect(ListedRoomList.empty().totalUnreadAt(now)).toBe(0);
  });
});

describe("Muting a listed room", () => {
  const now = new Date("2026-11-14T12:00:00.000Z");

  it("is muted only until its end, and keeps counting what arrives meanwhile", () => {
    const room = RoomMother.listed({ unreadCount: 2, mutedUntil: null });

    const muted = room.withMutedUntil(new Date("2026-11-14T13:00:00.000Z"));

    expect(muted.isMutedAt(now)).toBe(true);
    expect(muted.muteEndAt(now)?.toISOString()).toBe("2026-11-14T13:00:00.000Z");
    expect(muted.noticeableUnreadAt(now)).toBe(0);
    expect(muted.getUnreadCount()).toBe(2);
    expect(muted.isMutedAt(new Date("2026-11-14T13:00:00.000Z"))).toBe(false);
    expect(muted.withMutedUntil(null).muteEndAt(now)).toBeNull();
    expect(room.isMutedAt(now)).toBe(false);
  });
});

describe("Read marks in a room", () => {
  it("moves a member's mark forward only, and finds the other member of a direct room", () => {
    const { room, me, other } = RoomMother.direct();
    const [older, newer] = [MessageId.fromPrimitive(MessageMother.nextId()), MessageId.fromPrimitive(MessageMother.nextId())];

    const read = room.withReadMark(other, newer).withReadMark(other, older);

    expect(read.peerOf(me)?.getLastReadMessageId()?.equals(newer)).toBe(true);
    expect(room.peerOf(me)?.getLastReadMessageId()).toBeNull();
    expect(read.peerOf(other)?.is(me)).toBe(true);
    expect(RoomMother.group().room.peerOf(me)).toBeNull();
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
