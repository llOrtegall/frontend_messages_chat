import { MessageDraft, type MessageDraftPrimitive } from "../../message/domain/MessageDraft.ts";
import type { MessageId } from "../../message/domain/MessageId.ts";
import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";

/** Sends a drafted message; sending the same draft again is stored once and not announced twice. */
export const deliverMessage = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  async (draft: MessageDraftPrimitive): Promise<MessageId> =>
    realtimeRepository.send(MessageDraft.fromPrimitive(draft));
