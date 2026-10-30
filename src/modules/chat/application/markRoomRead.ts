import { MessageId } from "../../message/domain/MessageId.ts";
import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";
import { RoomId } from "../../room/domain/RoomId.ts";

export interface MarkRoomReadInput {
  readonly roomId: string;
  readonly messageId: string;
}

/** Tells the backend the user read the room up to that message (it never moves the mark back). */
export const markRoomRead = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  async ({ roomId, messageId }: MarkRoomReadInput): Promise<void> =>
    realtimeRepository.markRead(RoomId.fromPrimitive(roomId), MessageId.fromPrimitive(messageId));
