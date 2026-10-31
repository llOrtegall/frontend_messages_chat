import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import * as AttachmentMother from "../../../attachment/test/helpers/AttachmentMother.ts";
import * as AttachmentRepositoryMother from "../../../attachment/test/helpers/AttachmentRepositoryMother.ts";
import { AttachmentTypeNotAllowedError } from "../../../attachment/domain/errors/AttachmentTypeNotAllowedError.ts";
import { EmptyMessageError } from "../../../message/domain/errors/EmptyMessageError.ts";
import { InvalidMessageError } from "../../../message/domain/errors/InvalidMessageError.ts";
import * as MessageMother from "../../../message/test/helpers/MessageMother.ts";
import { deleteMessage } from "../../application/deleteMessage.ts";
import { deliverMessage } from "../../application/deliverMessage.ts";
import { draftMessage } from "../../application/draftMessage.ts";
import { editMessage } from "../../application/editMessage.ts";
import { followRooms } from "../../application/followRooms.ts";
import { markRoomRead } from "../../application/markRoomRead.ts";
import { notifyTyping } from "../../application/notifyTyping.ts";
import * as RealtimeRepositoryMother from "../helpers/RealtimeRepositoryMother.ts";

const roomId = faker.string.uuid();

describe("draftMessage", () => {
  const setUp = () => {
    const key = AttachmentMother.key();
    const attachmentRepository = AttachmentRepositoryMother.create({ upload: mock(async () => key) });
    return { key, attachmentRepository, draft: draftMessage({ attachmentRepository }) };
  };

  it("drafts the trimmed text with a fresh client id", async () => {
    const { draft } = setUp();

    const [first, second] = [await draft({ roomId, text: "  hola  " }), await draft({ roomId, text: "hola" })];

    expect(first.toPrimitive()).toMatchObject({ roomId, body: "hola", attachmentKey: null });
    expect(first.equals(second)).toBe(false);
  });

  it("uploads the file first and drafts it alone or with a caption", async () => {
    const { key, attachmentRepository, draft } = setUp();

    const drafted = await draft({ roomId, text: "", file: AttachmentMother.content() });

    expect(attachmentRepository.upload).toHaveBeenCalledTimes(1);
    expect(drafted.toPrimitive()).toMatchObject({ body: "", attachmentKey: key.toPrimitive() });
  });

  it("refuses an empty message, a refused file or an over-long text, uploading nothing for it", async () => {
    const { attachmentRepository, draft } = setUp();

    await expect(draft({ roomId, text: "   " })).rejects.toThrow(EmptyMessageError);
    await expect(draft({ roomId, text: "", file: AttachmentMother.content("image/svg+xml") })).rejects.toThrow(AttachmentTypeNotAllowedError);
    await expect(draft({ roomId, text: "x".repeat(4097), file: AttachmentMother.content() })).rejects.toThrow(InvalidMessageError);

    expect(attachmentRepository.upload).not.toHaveBeenCalled();
  });
});

describe("deliverMessage", () => {
  it("sends the draft as it was written, so a retry carries the same client id", async () => {
    const realtimeRepository = RealtimeRepositoryMother.create();
    const draft = MessageMother.draftPrimitive({ roomId });

    await deliverMessage({ realtimeRepository })(draft);
    await deliverMessage({ realtimeRepository })(draft);

    expect(realtimeRepository.send.mock.calls.map(([sent]) => sent.toPrimitive())).toEqual([draft, draft]);
  });
});

describe("other realtime actions", () => {
  it("edits with the trimmed text and refuses to empty a message", async () => {
    const realtimeRepository = RealtimeRepositoryMother.create();
    const messageId = MessageMother.nextId();

    await editMessage({ realtimeRepository })({ messageId, text: " editado " });
    await expect(editMessage({ realtimeRepository })({ messageId, text: "  " })).rejects.toThrow(EmptyMessageError);

    expect(realtimeRepository.edit.mock.calls.map(([, body]) => body.toPrimitive())).toEqual(["editado"]);
  });

  it("deletes, marks read, notifies typing and follows rooms by their ids", async () => {
    const realtimeRepository = RealtimeRepositoryMother.create();
    const messageId = MessageMother.nextId();

    await deleteMessage({ realtimeRepository })(messageId);
    await markRoomRead({ realtimeRepository })({ roomId, messageId });
    notifyTyping({ realtimeRepository })(roomId);
    followRooms({ realtimeRepository })([roomId]);

    expect(realtimeRepository.delete.mock.calls[0]![0].toPrimitive()).toBe(messageId);
    expect(realtimeRepository.markRead.mock.calls[0]!.map((id) => id.toPrimitive())).toEqual([roomId, messageId]);
    expect(realtimeRepository.notifyTyping.mock.calls[0]![0].toPrimitive()).toBe(roomId);
    expect(realtimeRepository.watchRooms.mock.calls[0]![0].map((id) => id.toPrimitive())).toEqual([roomId]);
  });
});
