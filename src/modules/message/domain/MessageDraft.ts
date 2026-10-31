import { AttachmentKey, type AttachmentKeyPrimitive } from "../../attachment/domain/AttachmentKey.ts";
import { RoomId, type RoomIdPrimitive } from "../../room/domain/RoomId.ts";
import { ClientMessageId, type ClientMessageIdPrimitive } from "./ClientMessageId.ts";
import { EmptyMessageError } from "./errors/EmptyMessageError.ts";
import { MessageBody, type MessageBodyPrimitive } from "./MessageBody.ts";

export interface MessageDraftPrimitive {
  readonly roomId: RoomIdPrimitive;
  readonly body: MessageBodyPrimitive;
  readonly attachmentKey: AttachmentKeyPrimitive | null;
  readonly clientMessageId: ClientMessageIdPrimitive;
}

/** A message the user is sending: a text, a file or both. */
export class MessageDraft {
  private constructor(
    private readonly roomId: RoomId,
    private readonly body: MessageBody,
    private readonly attachmentKey: AttachmentKey | null,
    private readonly clientMessageId: ClientMessageId,
  ) {}

  static create(roomId: RoomId, body: MessageBody, attachmentKey: AttachmentKey | null, clientMessageId: ClientMessageId): MessageDraft {
    MessageDraft.ensureHasContent(body, attachmentKey);
    return new MessageDraft(roomId, body, attachmentKey, clientMessageId);
  }

  static write(roomId: RoomId, body: MessageBody, attachmentKey: AttachmentKey | null): MessageDraft {
    return MessageDraft.create(roomId, body, attachmentKey, ClientMessageId.generate());
  }

  static fromPrimitive(data: MessageDraftPrimitive): MessageDraft {
    return MessageDraft.create(
      RoomId.fromPrimitive(data.roomId),
      MessageBody.fromPrimitive(data.body),
      data.attachmentKey === null ? null : AttachmentKey.fromPrimitive(data.attachmentKey),
      ClientMessageId.fromPrimitive(data.clientMessageId),
    );
  }

  /** Whether what the user typed and attached would make a message (before uploading anything). */
  static hasContent(text: string, hasAttachment: boolean): boolean {
    return text.trim().length > 0 || hasAttachment;
  }

  private static ensureHasContent(body: MessageBody, attachmentKey: AttachmentKey | null): void {
    if (body.isEmpty() && attachmentKey === null) throw new EmptyMessageError();
  }

  getRoomId(): RoomId {
    return this.roomId;
  }

  getClientMessageId(): ClientMessageId {
    return this.clientMessageId;
  }

  getBody(): MessageBody {
    return this.body;
  }

  hasAttachment(): boolean {
    return this.attachmentKey !== null;
  }

  equals(other: MessageDraft): boolean {
    return this.clientMessageId.equals(other.clientMessageId);
  }

  toPrimitive(): MessageDraftPrimitive {
    return {
      roomId: this.roomId.toPrimitive(),
      body: this.body.toPrimitive(),
      attachmentKey: this.attachmentKey?.toPrimitive() ?? null,
      clientMessageId: this.clientMessageId.toPrimitive(),
    };
  }
}
