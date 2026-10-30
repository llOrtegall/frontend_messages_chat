import { MessageId } from "../../message/domain/MessageId.ts";
import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";

export const deleteMessage = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  async (messageId: string): Promise<void> => realtimeRepository.delete(MessageId.fromPrimitive(messageId));
