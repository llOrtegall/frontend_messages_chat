import type { RoomId } from "../../room/domain/RoomId.ts";
import type { UserId } from "../../user/domain/UserId.ts";

/** What the chat decided must happen after an event; whoever runs the chat carries it out. */
export type ChatEffect =
  | { readonly type: "markRead"; readonly roomId: RoomId }
  | { readonly type: "reloadRooms" }
  | { readonly type: "typingStarted"; readonly roomId: RoomId; readonly userId: UserId };
