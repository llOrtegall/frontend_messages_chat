import { faker } from "@faker-js/faker";
import { Chat } from "../../modules/chat/domain/Chat.ts";
import { MessageList } from "../../modules/message/domain/MessageList.ts";
import * as MessageMother from "../../modules/message/test/helpers/MessageMother.ts";
import { ListedRoomList } from "../../modules/room/domain/ListedRoomList.ts";
import type { MemberRolePrimitive } from "../../modules/room/domain/MemberRole.ts";
import { Room } from "../../modules/room/domain/Room.ts";
import * as RoomMother from "../../modules/room/test/helpers/RoomMother.ts";
import { UserId } from "../../modules/user/domain/UserId.ts";

/** A connected chat with a group open: `me` with `myRole`, plus Bea as a plain member who wrote `messages`. */
export const openGroup = ({ myRole = "owner" as MemberRolePrimitive, messages = ["hola"] as string[] } = {}) => {
  const me = UserId.fromPrimitive(faker.string.uuid());
  const bea = RoomMother.memberPrimitive({ displayName: "Bea", role: "member" });
  const room = Room.fromPrimitive(
    RoomMother.createPrimitive({ name: "Equipo", members: [RoomMother.memberPrimitive({ userId: me.toPrimitive(), displayName: "Yo", role: myRole }), bea] }),
  );
  const listed = RoomMother.listed({ id: room.getId().toPrimitive(), name: "Equipo", unreadCount: 0 });
  const history = MessageList.create(messages.map((body) => MessageMother.create({ roomId: room.getId().toPrimitive(), senderId: bea.userId, body })));
  const chat = Chat.start(me)
    .connectionChanged("open")
    .roomsLoaded(ListedRoomList.create([listed]))
    .opened(room.getId())
    .openRoomLoaded(room)
    .olderPageLoaded(room.getId(), history, 50);
  return { chat, me, room, bea: UserId.fromPrimitive(bea.userId) };
};
