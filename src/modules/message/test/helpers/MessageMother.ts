import { faker } from "@faker-js/faker";
import { Message, type MessagePrimitive } from "../../domain/Message.ts";
import { MessageDraft, type MessageDraftPrimitive } from "../../domain/MessageDraft.ts";

let sequence = 0;

/** UUIDv7-shaped ids that grow with each call, so messages sort in creation order. */
export const nextId = (): string => {
  sequence += 1;
  const time = (Date.now() + sequence).toString(16).padStart(12, "0");
  return `${time.slice(0, 8)}-${time.slice(8, 12)}-7${faker.string.hexadecimal({ length: 3, prefix: "" })}-8${faker.string.hexadecimal({ length: 3, prefix: "" })}-${faker.string.hexadecimal({ length: 12, prefix: "" })}`.toLowerCase();
};

export const createPrimitive = (overrides: Partial<MessagePrimitive> = {}): MessagePrimitive => ({
  id: nextId(),
  roomId: faker.string.uuid(),
  senderId: faker.string.uuid(),
  body: faker.lorem.sentence(),
  attachmentKey: null,
  attachmentMeta: null,
  editedAt: null,
  deletedAt: null,
  createdAt: faker.date.recent().toISOString(),
  ...overrides,
});

export const create = (overrides: Partial<MessagePrimitive> = {}): Message => Message.fromPrimitive(createPrimitive(overrides));

export const draftPrimitive = (overrides: Partial<MessageDraftPrimitive> = {}): MessageDraftPrimitive => ({
  roomId: faker.string.uuid(),
  body: faker.lorem.sentence(),
  attachmentKey: null,
  clientMessageId: faker.string.uuid(),
  ...overrides,
});

export const draft = (overrides: Partial<MessageDraftPrimitive> = {}): MessageDraft => MessageDraft.fromPrimitive(draftPrimitive(overrides));
