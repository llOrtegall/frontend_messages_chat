import { AttachmentKey, type AttachmentKeyPrimitive } from "../../attachment/domain/AttachmentKey.ts";
import { AttachmentMeta, type AttachmentMetaPrimitive } from "../../attachment/domain/AttachmentMeta.ts";
import { RoomId, type RoomIdPrimitive } from "../../room/domain/RoomId.ts";
import { UserId, type UserIdPrimitive } from "../../user/domain/UserId.ts";
import { MessageBody, type MessageBodyPrimitive } from "./MessageBody.ts";
import { MessageId, type MessageIdPrimitive } from "./MessageId.ts";

export interface MessagePrimitive {
  readonly id: MessageIdPrimitive;
  readonly roomId: RoomIdPrimitive;
  readonly senderId: UserIdPrimitive;
  readonly body: MessageBodyPrimitive;
  readonly attachmentKey: AttachmentKeyPrimitive | null;
  readonly attachmentMeta: AttachmentMetaPrimitive | null;
  readonly editedAt: string | null;
  readonly deletedAt: string | null;
  readonly createdAt: string;
}

export interface MessageAttributes {
  readonly id: MessageId;
  readonly roomId: RoomId;
  readonly senderId: UserId;
  readonly body: MessageBody;
  readonly attachmentKey: AttachmentKey | null;
  readonly attachmentMeta: AttachmentMeta | null;
  readonly editedAt: Date | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
}

const dateOrNull = (iso: string | null): Date | null => (iso === null ? null : new Date(iso));

export class Message {
  private constructor(private readonly attributes: MessageAttributes) {}

  static create(attributes: MessageAttributes): Message {
    return new Message({ ...attributes });
  }

  static fromPrimitive(data: MessagePrimitive): Message {
    return Message.create({
      id: MessageId.fromPrimitive(data.id),
      roomId: RoomId.fromPrimitive(data.roomId),
      senderId: UserId.fromPrimitive(data.senderId),
      body: MessageBody.fromPrimitive(data.body),
      attachmentKey: data.attachmentKey === null ? null : AttachmentKey.fromPrimitive(data.attachmentKey),
      attachmentMeta: data.attachmentMeta === null ? null : AttachmentMeta.fromPrimitive(data.attachmentMeta),
      editedAt: dateOrNull(data.editedAt),
      deletedAt: dateOrNull(data.deletedAt),
      createdAt: new Date(data.createdAt),
    });
  }

  getId(): MessageId {
    return this.attributes.id;
  }

  getRoomId(): RoomId {
    return this.attributes.roomId;
  }

  getSenderId(): UserId {
    return this.attributes.senderId;
  }

  getBody(): MessageBody {
    return this.attributes.body;
  }

  getAttachment(): AttachmentMeta | null {
    return this.attributes.attachmentMeta;
  }

  getCreatedAt(): Date {
    return this.attributes.createdAt;
  }

  isFrom(userId: UserId): boolean {
    return this.attributes.senderId.equals(userId);
  }

  isDeleted(): boolean {
    return this.attributes.deletedAt !== null;
  }

  wasEdited(): boolean {
    return this.attributes.editedAt !== null;
  }

  /** Only its sender edits a message, and not once it is deleted (the backend enforces it too). */
  canBeEditedBy(userId: UserId): boolean {
    return this.isFrom(userId) && !this.isDeleted();
  }

  equals(other: Message): boolean {
    return this.attributes.id.equals(other.attributes.id);
  }

  toPrimitive(): MessagePrimitive {
    const { id, roomId, senderId, body, attachmentKey, attachmentMeta, editedAt, deletedAt, createdAt } = this.attributes;
    return {
      id: id.toPrimitive(),
      roomId: roomId.toPrimitive(),
      senderId: senderId.toPrimitive(),
      body: body.toPrimitive(),
      attachmentKey: attachmentKey?.toPrimitive() ?? null,
      attachmentMeta: attachmentMeta?.toPrimitive() ?? null,
      editedAt: editedAt?.toISOString() ?? null,
      deletedAt: deletedAt?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
    };
  }
}
