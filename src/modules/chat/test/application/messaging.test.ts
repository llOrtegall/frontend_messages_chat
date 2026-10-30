import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import * as AttachmentMother from "../../../attachment/test/helpers/AttachmentMother.ts";
import * as AttachmentRepositoryMother from "../../../attachment/test/helpers/AttachmentRepositoryMother.ts";
import { AttachmentTypeNotAllowedError } from "../../../attachment/domain/errors/AttachmentTypeNotAllowedError.ts";
import { EmptyMessageError } from "../../../message/domain/errors/EmptyMessageError.ts";
import { InvalidMessageError } from "../../../message/domain/errors/InvalidMessageError.ts";
import * as MessageMother from "../../../message/test/helpers/MessageMother.ts";
import { deleteMessage } from "../../application/deleteMessage.ts";
import { editMessage } from "../../application/editMessage.ts";
import { followRooms } from "../../application/followRooms.ts";
import { markRoomRead } from "../../application/markRoomRead.ts";
import { notifyTyping } from "../../application/notifyTyping.ts";
import { sendMessage } from "../../application/sendMessage.ts";
import * as RealtimeRepositoryMother from "../helpers/RealtimeRepositoryMother.ts";

const roomId = faker.string.uuid();

describe("sendMessage", () => {
  const setUp = () => {
    const key = AttachmentMother.key();
    const realtimeRepository = RealtimeRepositoryMother.create();
    const attachmentRepository = AttachmentRepositoryMother.create({ upload: mock(async () => key) });
    return { key, realtimeRepository, attachmentRepository, send: sendMessage({ realtimeRepository, attachmentRepository }) };
  };

  it("sends the trimmed text with a fresh client id", async () => {
    const { realtimeRepository, send } = setUp();

    await send({ roomId, text: "  hola  " });

    const [draft] = realtimeRepository.send.mock.calls[0]!;
    expect(draft.toPrimitive()).toMatchObject({ roomId, body: "hola", attachmentKey: null });
  });

  it("uploads the file first and sends it alone or with a caption", async () => {
    const { key, realtimeRepository, attachmentRepository, send } = setUp();

    await send({ roomId, text: "", file: AttachmentMother.content() });

    expect(attachmentRepository.upload).toHaveBeenCalledTimes(1);
    expect(realtimeRepository.send.mock.calls[0]![0].toPrimitive()).toMatchObject({ body: "", attachmentKey: key.toPrimitive() });
  });

  it("sends nothing for an empty message, a refused file or an over-long text (uploading nothing for it)", async () => {
    const { realtimeRepository, attachmentRepository, send } = setUp();

    await expect(send({ roomId, text: "   " })).rejects.toThrow(EmptyMessageError);
    await expect(send({ roomId, text: "", file: AttachmentMother.content("image/svg+xml") })).rejects.toThrow(AttachmentTypeNotAllowedError);
    await expect(send({ roomId, text: "x".repeat(4097), file: AttachmentMother.content() })).rejects.toThrow(InvalidMessageError);

    expect(realtimeRepository.send).not.toHaveBeenCalled();
    expect(attachmentRepository.upload).not.toHaveBeenCalled();
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
