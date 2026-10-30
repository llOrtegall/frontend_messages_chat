import { uploadAttachment } from "../../attachment/application/uploadAttachment.ts";
import type { AttachmentRepository } from "../../attachment/domain/AttachmentRepository.ts";
import { MessageBody } from "../../message/domain/MessageBody.ts";
import { MessageDraft } from "../../message/domain/MessageDraft.ts";
import type { MessageId } from "../../message/domain/MessageId.ts";
import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";
import { RoomId } from "../../room/domain/RoomId.ts";

interface Dependencies {
  readonly realtimeRepository: RealtimeRepository;
  readonly attachmentRepository: AttachmentRepository;
}

export interface SendMessageInput {
  readonly roomId: string;
  readonly text: string;
  readonly file?: Blob;
}

/** Uploads the file first, if any; the message reaches the room through its message.created event. */
export const sendMessage = ({ realtimeRepository, attachmentRepository }: Dependencies) => {
  const upload = uploadAttachment({ attachmentRepository });

  return async ({ roomId, text, file }: SendMessageInput): Promise<MessageId> => {
    const room = RoomId.fromPrimitive(roomId);
    // Checked before uploading anything, so a refused text doesn't leave a file behind.
    const body = MessageBody.create(text.trim());
    const attachmentKey = file ? await upload(file) : null;
    return realtimeRepository.send(MessageDraft.write(room, body, attachmentKey));
  };
};
