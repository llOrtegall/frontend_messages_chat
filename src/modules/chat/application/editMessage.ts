import { EmptyMessageError } from "../../message/domain/errors/EmptyMessageError.ts";
import { MessageBody } from "../../message/domain/MessageBody.ts";
import { MessageId } from "../../message/domain/MessageId.ts";
import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";

export interface EditMessageInput {
  readonly messageId: string;
  readonly text: string;
}

export const editMessage = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  async ({ messageId, text }: EditMessageInput): Promise<void> => {
    const body = MessageBody.create(text.trim());
    if (body.isEmpty()) throw new EmptyMessageError();
    await realtimeRepository.edit(MessageId.fromPrimitive(messageId), body);
  };
