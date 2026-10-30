import { describe, expect, it } from "bun:test";
import { AttachmentKey } from "../../../attachment/domain/AttachmentKey.ts";
import { RoomId } from "../../../room/domain/RoomId.ts";
import { ClientMessageId } from "../../domain/ClientMessageId.ts";
import { EmptyMessageError } from "../../domain/errors/EmptyMessageError.ts";
import { InvalidMessageError } from "../../domain/errors/InvalidMessageError.ts";
import { MessageDraft } from "../../domain/MessageDraft.ts";

const roomId = RoomId.fromPrimitive(crypto.randomUUID());

describe("MessageDraft", () => {
  it("trims the text and gets a fresh client id each time", () => {
    const [first, second] = [MessageDraft.write(roomId, "  hola  ", null), MessageDraft.write(roomId, "hola", null)];

    expect(first.toPrimitive().body).toBe("hola");
    expect(first.equals(second)).toBe(false);
  });

  it("may carry a file alone, but not nothing", () => {
    expect(MessageDraft.write(roomId, "   ", AttachmentKey.create("uploads/u/1.png")).toPrimitive().body).toBe("");
    expect(() => MessageDraft.write(roomId, "   ", null)).toThrow(EmptyMessageError);
  });

  it("survives a primitive round-trip, keeping its client id", () => {
    const draft = MessageDraft.write(roomId, "hola", null);

    expect(MessageDraft.fromPrimitive(draft.toPrimitive()).toPrimitive()).toEqual(draft.toPrimitive());
  });

  it("rejects a client id that is not a uuid", () => {
    expect(() => ClientMessageId.create("c1")).toThrow(InvalidMessageError);
  });
});
