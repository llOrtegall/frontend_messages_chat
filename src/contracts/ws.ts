import { z } from "zod";
import { Id, IsoDateTime } from "./common.ts";
import { MessageSchema } from "./messages.ts";
import { RoomMemberSchema, RoomSchema } from "./rooms.ts";

export const WsEnvelopeSchema = z.object({
  type: z.string(),
  id: z.string().optional(),
  refId: z.string().optional(),
  payload: z.unknown().optional(),
  ts: z.number().optional(),
});
export type WsEnvelope = z.infer<typeof WsEnvelopeSchema>;

// ── Client → server payloads ──────────────────────────────────────────

export const ChatSubscribePayloadSchema = z.object({
  roomIds: z.array(Id).min(1).max(50),
});

export const ChatUnsubscribePayloadSchema = z.object({
  roomIds: z.array(Id).min(1).max(50),
});

export const ChatSendPayloadSchema = z.object({
  roomId: Id,
  body: z.string().max(4096).default(""),
  attachmentKey: z.string().max(512).optional(),
  clientMessageId: z.string().max(128).optional(),
});

export const ChatEditPayloadSchema = z.object({
  messageId: Id,
  body: z.string().min(1).max(4096),
});

export const ChatDeletePayloadSchema = z.object({
  messageId: Id,
});

export const ChatReadPayloadSchema = z.object({
  roomId: Id,
  messageId: Id,
});

export const ChatTypingPayloadSchema = z.object({
  roomId: Id,
});

/** Request type → payload the client sends, and payload of the `ack` it gets back. */
export const WsRequests = {
  "chat.subscribe": { payload: ChatSubscribePayloadSchema, ack: z.strictObject({ subscribed: z.array(Id) }) },
  "chat.unsubscribe": { payload: ChatUnsubscribePayloadSchema, ack: z.strictObject({ unsubscribed: z.array(Id) }) },
  "chat.send": { payload: ChatSendPayloadSchema, ack: z.strictObject({ id: Id, createdAt: IsoDateTime }) },
  "chat.edit": { payload: ChatEditPayloadSchema, ack: z.strictObject({ id: Id, editedAt: IsoDateTime.nullable() }) },
  "chat.delete": { payload: ChatDeletePayloadSchema, ack: z.strictObject({ messageId: Id }) },
  "chat.read": { payload: ChatReadPayloadSchema, ack: z.strictObject({ roomId: Id, messageId: Id }) },
  "chat.typing": { payload: ChatTypingPayloadSchema, ack: z.strictObject({}) },
  "presence.heartbeat": { payload: z.object({}).optional(), ack: z.strictObject({ ts: z.number() }) },
} as const;
export type WsRequestType = keyof typeof WsRequests;
export type WsRequestPayload<T extends WsRequestType> = z.input<(typeof WsRequests)[T]["payload"]>;
export type WsAckPayload<T extends WsRequestType> = z.infer<(typeof WsRequests)[T]["ack"]>;

// ── Server → client frames ────────────────────────────────────────────

const frame = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  z.strictObject({ type: z.literal(type), payload, refId: z.string().optional(), ts: z.number() });

export const WsErrorPayloadSchema = z.strictObject({ code: z.string(), message: z.string() });

export const ServerFrameSchema = z.discriminatedUnion("type", [
  frame("ack", z.unknown()),
  frame("error", WsErrorPayloadSchema),
  z.strictObject({ type: z.literal("pong"), refId: z.string().optional(), ts: z.number() }),
  frame("message.created", MessageSchema),
  frame("message.edited", MessageSchema),
  frame("message.deleted", z.strictObject({ messageId: Id, roomId: Id })),
  frame("message.read", z.strictObject({ roomId: Id, userId: Id, messageId: Id })),
  frame("user.typing", z.strictObject({ roomId: Id, userId: Id })),
  frame("presence.online", z.strictObject({ userId: Id })),
  frame("presence.offline", z.strictObject({ userId: Id })),
  // Sent to the affected user: a room appeared in / disappeared from their room list.
  frame("room.added", z.strictObject({ room: RoomSchema })),
  frame("room.removed", z.strictObject({ roomId: Id })),
  // Sent to subscribers of the room.
  frame("room.member_added", z.strictObject({ roomId: Id, member: RoomMemberSchema })),
  frame("room.member_removed", z.strictObject({ roomId: Id, userId: Id })),
]);
export type ServerFrame = z.infer<typeof ServerFrameSchema>;
/** Push events (everything except request responses). */
export type ServerEvent = Exclude<ServerFrame, { type: "ack" | "error" | "pong" }>;
