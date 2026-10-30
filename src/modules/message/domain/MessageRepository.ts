import type { RoomId } from "../../room/domain/RoomId.ts";
import type { MessageId } from "./MessageId.ts";
import type { MessageList } from "./MessageList.ts";

export interface MessageRepository {
  /** Up to `limit` messages of the room sent before `before` (the newest ones when null). */
  listPage(roomId: RoomId, before: MessageId | null, limit: number): Promise<MessageList>;
}
