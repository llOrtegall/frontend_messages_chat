import { faker } from "@faker-js/faker";
import { Message } from "../../../message/domain/Message.ts";
import { MessageList } from "../../../message/domain/MessageList.ts";
import * as MessageMother from "../../../message/test/helpers/MessageMother.ts";
import { ListedRoomList } from "../../../room/domain/ListedRoomList.ts";
import { RoomId } from "../../../room/domain/RoomId.ts";
import * as RoomMother from "../../../room/test/helpers/RoomMother.ts";
import { UserId } from "../../../user/domain/UserId.ts";
import { Chat } from "../../domain/Chat.ts";

export const me = UserId.fromPrimitive(faker.string.uuid());
export const other = UserId.fromPrimitive(faker.string.uuid());

/** A connected chat with two rooms loaded (none open), the first one the most recently active. */
export const withRooms = () => {
  const [busy, quiet] = [
    RoomMother.listed({ unreadCount: 0, lastMessageAt: "2026-11-14T11:00:00.000Z" }),
    RoomMother.listed({ unreadCount: 2, lastMessageAt: "2026-11-01T11:00:00.000Z" }),
  ];
  const chat = Chat.start(me).connectionChanged("open").roomsLoaded(ListedRoomList.create([busy, quiet]));
  return { chat, busy: busy.getId(), quiet: quiet.getId() };
};

export const messageIn = (roomId: RoomId, from: UserId = other, overrides: Partial<Parameters<typeof MessageMother.createPrimitive>[0]> = {}) =>
  MessageMother.create({ roomId: roomId.toPrimitive(), senderId: from.toPrimitive(), createdAt: new Date().toISOString(), ...overrides });

export const created = (message: Message) => ({ type: "message.created" as const, message });

export const page = (...messages: Message[]) => MessageList.create(messages);
