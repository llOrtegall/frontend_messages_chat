import { RoomId } from "../../room/domain/RoomId.ts";
import { MessageId } from "../domain/MessageId.ts";
import type { MessageList } from "../domain/MessageList.ts";
import type { MessageRepository } from "../domain/MessageRepository.ts";

export interface ListMessagesInput {
  readonly roomId: string;
  readonly before: string | null;
  readonly limit: number;
}

export const listMessages = ({ messageRepository }: { readonly messageRepository: MessageRepository }) =>
  async ({ roomId, before, limit }: ListMessagesInput): Promise<MessageList> =>
    messageRepository.listPage(RoomId.fromPrimitive(roomId), before === null ? null : MessageId.fromPrimitive(before), limit);
