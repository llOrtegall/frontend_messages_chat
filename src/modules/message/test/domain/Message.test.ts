import { describe, expect, it } from "bun:test";
import * as UserIdMother from "../../../user/test/helpers/UserIdMother.ts";
import { InvalidMessageError } from "../../domain/errors/InvalidMessageError.ts";
import { Message } from "../../domain/Message.ts";
import { MessageBody } from "../../domain/MessageBody.ts";
import { MessageList } from "../../domain/MessageList.ts";
import * as MessageMother from "../helpers/MessageMother.ts";

describe("Message", () => {
  it("survives a primitive round-trip, attachment included", () => {
    const primitive = MessageMother.createPrimitive({
      attachmentKey: "uploads/u/1.png",
      attachmentMeta: { url: "https://cdn.example.com/uploads/u/1.png", contentType: "image/png", sizeBytes: 10 },
      editedAt: new Date().toISOString(),
    });

    expect(Message.fromPrimitive(primitive).toPrimitive()).toEqual(primitive);
  });

  it("is editable by its sender only, and not once deleted", () => {
    const sender = UserIdMother.create();
    const message = MessageMother.create({ senderId: sender.toPrimitive() });

    expect(message.canBeEditedBy(sender)).toBe(true);
    expect(message.canBeEditedBy(UserIdMother.create())).toBe(false);
    expect(MessageMother.create({ senderId: sender.toPrimitive(), deletedAt: new Date().toISOString() }).canBeEditedBy(sender)).toBe(false);
  });

  it("knows whether it was edited", () => {
    expect(MessageMother.create().wasEdited()).toBe(false);
    expect(MessageMother.create({ editedAt: new Date().toISOString() }).wasEdited()).toBe(true);
  });
});

describe("MessageBody", () => {
  it("allows an empty text (a file alone) and up to 4096 characters", () => {
    expect(MessageBody.create("").isEmpty()).toBe(true);
    expect(MessageBody.create("x".repeat(4096)).toPrimitive()).toHaveLength(4096);
    expect(() => MessageBody.create("x".repeat(4097))).toThrow(InvalidMessageError);
  });
});

describe("MessageList", () => {
  it("keeps messages oldest first whatever order they arrive in", () => {
    const [first, second, third] = [MessageMother.create(), MessageMother.create(), MessageMother.create()];

    const list = MessageList.create([third, first]).upsert(second);

    expect(list.map((message) => message.getId())).toEqual([first.getId(), second.getId(), third.getId()]);
    expect(list.oldest()).toBe(first);
    expect(list.newest()).toBe(third);
  });

  it("replaces the stored version on an upsert, leaving the original untouched", () => {
    const original = MessageMother.create({ body: "hola" });
    const list = MessageList.create([original]);

    const edited = list.upsert(Message.fromPrimitive({ ...original.toPrimitive(), body: "hola (editado)" }));

    expect(edited.toPrimitive().map((message) => message.body)).toEqual(["hola (editado)"]);
    expect(list.toPrimitive()[0]!.body).toBe("hola");
  });

  it("merges an older page keeping what is loaded, which may be newer", () => {
    const [older, shared] = [MessageMother.create(), MessageMother.create({ body: "editado" })];
    const loaded = MessageList.create([shared]);
    const page = MessageList.create([older, Message.fromPrimitive({ ...shared.toPrimitive(), body: "viejo" })]);

    const merged = loaded.merge(page);

    expect(merged.toPrimitive().map((message) => message.body)).toEqual([older.toPrimitive().body, "editado"]);
  });

  it("removes a message by id", () => {
    const [kept, removed] = [MessageMother.create(), MessageMother.create()];

    expect(MessageList.create([kept, removed]).remove(removed.getId()).equals(MessageList.create([kept]))).toBe(true);
    expect(MessageList.empty().isEmpty()).toBe(true);
  });
});
