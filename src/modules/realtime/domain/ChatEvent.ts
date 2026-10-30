import type { Message } from "../../message/domain/Message.ts";
import type { MessageId } from "../../message/domain/MessageId.ts";
import type { ListedRoom } from "../../room/domain/ListedRoom.ts";
import type { RoomId } from "../../room/domain/RoomId.ts";
import type { RoomMember } from "../../room/domain/RoomMember.ts";
import type { UserId } from "../../user/domain/UserId.ts";

/** What the backend pushes about the user's rooms while the realtime channel is open. */
export type ChatEvent =
  | { readonly type: "message.created" | "message.edited"; readonly message: Message }
  | { readonly type: "message.deleted"; readonly roomId: RoomId; readonly messageId: MessageId }
  | { readonly type: "message.read"; readonly roomId: RoomId; readonly userId: UserId; readonly messageId: MessageId }
  | { readonly type: "user.typing"; readonly roomId: RoomId; readonly userId: UserId }
  | { readonly type: "presence.changed"; readonly userId: UserId; readonly isOnline: boolean }
  | { readonly type: "room.added"; readonly room: ListedRoom }
  | { readonly type: "room.removed"; readonly roomId: RoomId }
  | { readonly type: "member.joined" | "member.updated"; readonly roomId: RoomId; readonly member: RoomMember }
  | { readonly type: "member.left"; readonly roomId: RoomId; readonly userId: UserId };
