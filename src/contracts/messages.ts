import { z } from "zod";
import { Id, IsoDateTime } from "./common.ts";

export const MessageSchema = z.strictObject({
  id: Id,
  roomId: Id,
  senderId: Id,
  body: z.string(),
  attachmentKey: z.string().nullable(),
  attachmentMeta: z.record(z.string(), z.unknown()).nullable(),
  editedAt: IsoDateTime.nullable(),
  deletedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type Message = z.infer<typeof MessageSchema>;

// Requests

export const SendMessageSchema = z.object({
  body: z.string().max(4096).default(""),
  attachmentKey: z.string().max(512).optional(),
  clientMessageId: z.string().max(128).optional(),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export const EditMessageSchema = z.object({
  body: z.string().min(1).max(4096),
});
export type EditMessageInput = z.infer<typeof EditMessageSchema>;

export const ListMessagesQuerySchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;

// Responses

export const MessageResponseSchema = z.strictObject({ message: MessageSchema });
export const MessageListResponseSchema = z.strictObject({ messages: z.array(MessageSchema) });
