import { describe, expect, it } from "bun:test";
import { AttachmentKey } from "../../../attachment/domain/AttachmentKey.ts";
import { RoomId } from "../../../room/domain/RoomId.ts";
import { ClientMessageId } from "../../domain/ClientMessageId.ts";
import { EmptyMessageError } from "../../domain/errors/EmptyMessageError.ts";
import { InvalidMessageError } from "../../domain/errors/InvalidMessageError.ts";
import { MessageBody } from "../../domain/MessageBody.ts";
import { MessageDraft } from "../../domain/MessageDraft.ts";

const roomId = RoomId.fromPrimitive(crypto.randomUUID());

describe("MessageDraft", () => {
  it("gets a fresh client id each time", () => {
    const body = MessageBody.create("hola");

    expect(MessageDraft.write(roomId, body, null).equals(MessageDraft.write(roomId, body, null))).toBe(false);
  });

  it("may carry a file alone, but not nothing", () => {
    expect(MessageDraft.write(roomId, MessageBody.create(""), AttachmentKey.create("uploads/u/1.png")).toPrimitive().body).toBe("");
    expect(() => MessageDraft.write(roomId, MessageBody.create(""), null)).toThrow(EmptyMessageError);
  });

  it("survives a primitive round-trip, keeping its client id", () => {
    const draft = MessageDraft.write(roomId, MessageBody.create("hola"), null);

    expect(MessageDraft.fromPrimitive(draft.toPrimitive()).toPrimitive()).toEqual(draft.toPrimitive());
  });

  it("tells its client id, text and whether it carries a file", () => {
    const withFile = MessageDraft.write(roomId, MessageBody.create("mira"), AttachmentKey.create("uploads/u/1.png"));

    expect(withFile.getClientMessageId().toPrimitive()).toBe(withFile.toPrimitive().clientMessageId);
    expect(withFile.getBody().toPrimitive()).toBe("mira");
    expect(withFile.hasAttachment()).toBe(true);
    expect(MessageDraft.write(roomId, MessageBody.create("hola"), null).hasAttachment()).toBe(false);
  });

  it("rejects a client id that is not a uuid", () => {
    expect(() => ClientMessageId.create("c1")).toThrow(InvalidMessageError);
  });

  it("tells whether what the user typed and attached would make a message", () => {
    expect(MessageDraft.hasContent("  hola ", false)).toBe(true);
    expect(MessageDraft.hasContent("   ", true)).toBe(true);
    expect(MessageDraft.hasContent("   ", false)).toBe(false);
  });
});
