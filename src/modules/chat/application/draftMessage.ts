import { uploadAttachment } from "../../attachment/application/uploadAttachment.ts";
import type { AttachmentRepository } from "../../attachment/domain/AttachmentRepository.ts";
import { MessageBody } from "../../message/domain/MessageBody.ts";
import { MessageDraft } from "../../message/domain/MessageDraft.ts";
import { RoomId } from "../../room/domain/RoomId.ts";

export interface DraftMessageInput {
  readonly roomId: string;
  readonly text: string;
  readonly file?: Blob;
}

/** Turns what the user wrote into a message ready to send, with its file already uploaded. */
export const draftMessage = ({ attachmentRepository }: { readonly attachmentRepository: AttachmentRepository }) => {
  const upload = uploadAttachment({ attachmentRepository });

  return async ({ roomId, text, file }: DraftMessageInput): Promise<MessageDraft> => {
    const room = RoomId.fromPrimitive(roomId);
    // Checked before uploading anything, so a refused text doesn't leave a file behind.
    const body = MessageBody.create(text.trim());
    const attachmentKey = file ? await upload(file) : null;
    return MessageDraft.write(room, body, attachmentKey);
  };
};
