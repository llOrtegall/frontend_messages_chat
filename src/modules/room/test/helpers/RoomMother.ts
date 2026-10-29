import { faker } from "@faker-js/faker";
import { UserId } from "../../../user/domain/UserId.ts";
import { ListedRoom, type ListedRoomPrimitive, type NewRoomPrimitive } from "../../domain/ListedRoom.ts";
import type { MemberRolePrimitive } from "../../domain/MemberRole.ts";
import { Room, type RoomPrimitive } from "../../domain/Room.ts";
import type { RoomMemberPrimitive } from "../../domain/RoomMember.ts";

export const memberPrimitive = (overrides: Partial<RoomMemberPrimitive> = {}): RoomMemberPrimitive => ({
  userId: faker.string.uuid(),
  displayName: faker.person.firstName(),
  avatarUrl: null,
  role: "member",
  joinedAt: faker.date.past().toISOString(),
  lastReadMessageId: null,
  mutedUntil: null,
  ...overrides,
});

export const createPrimitive = (overrides: Partial<RoomPrimitive> = {}): RoomPrimitive => ({
  id: faker.string.uuid(),
  kind: "group",
  name: faker.company.name().slice(0, 100),
  createdBy: faker.string.uuid(),
  lastMessageAt: faker.date.recent().toISOString(),
  createdAt: faker.date.past().toISOString(),
  members: [memberPrimitive({ role: "owner" })],
  ...overrides,
});

/** A group with one member of each role. */
export const group = () => {
  const [owner, admin, otherAdmin, plain] = (["owner", "admin", "admin", "member"] as MemberRolePrimitive[]).map((role) =>
    memberPrimitive({ role }),
  );
  const room = Room.fromPrimitive(createPrimitive({ members: [owner!, admin!, otherAdmin!, plain!] }));
  const member = (primitive: RoomMemberPrimitive) => room.getMembers().find(UserId.fromPrimitive(primitive.userId))!;
  return { room, owner: member(owner!), admin: member(admin!), otherAdmin: member(otherAdmin!), plain: member(plain!) };
};

export const direct = () => {
  const [me, other] = [memberPrimitive(), memberPrimitive()];
  const room = Room.fromPrimitive(createPrimitive({ kind: "dm", name: null, members: [me, other] }));
  return { room, me: room.getMembers().userIds()[0]!, other: room.getMembers().userIds()[1]! };
};

/** A room as push events and creation responses carry it. */
export const newRoomPrimitive = (overrides: Partial<NewRoomPrimitive> = {}): NewRoomPrimitive => ({
  id: faker.string.uuid(),
  kind: "group",
  name: faker.company.name().slice(0, 100),
  createdBy: faker.string.uuid(),
  lastMessageAt: null,
  createdAt: faker.date.past().toISOString(),
  ...overrides,
});

export const listedPrimitive = (overrides: Partial<ListedRoomPrimitive> = {}): ListedRoomPrimitive => ({
  id: faker.string.uuid(),
  kind: "group",
  name: faker.company.name().slice(0, 100),
  createdBy: faker.string.uuid(),
  lastMessageAt: faker.date.recent().toISOString(),
  createdAt: faker.date.past().toISOString(),
  unreadCount: faker.number.int({ min: 0, max: 5 }),
  lastReadMessageId: null,
  mutedUntil: null,
  peer: null,
  ...overrides,
});

export const listed = (overrides: Partial<ListedRoomPrimitive> = {}): ListedRoom => ListedRoom.fromPrimitive(listedPrimitive(overrides));
