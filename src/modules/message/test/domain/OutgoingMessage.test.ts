import { describe, expect, it } from "bun:test";
import { RoomId } from "../../../room/domain/RoomId.ts";
import { InvalidMessageError } from "../../domain/errors/InvalidMessageError.ts";
import { OutgoingMessage } from "../../domain/OutgoingMessage.ts";
import { OutgoingMessageList } from "../../domain/OutgoingMessageList.ts";
import * as MessageMother from "../helpers/MessageMother.ts";

const roomId = RoomId.fromPrimitive(crypto.randomUUID());
const sendingIn = (room = roomId) => OutgoingMessage.sending(MessageMother.draft({ roomId: room.toPrimitive() }));

describe("OutgoingMessage", () => {
  it("is identified by its draft's client id and starts as sending", () => {
    const draft = MessageMother.draft();

    const outgoing = OutgoingMessage.sending(draft);

    expect(outgoing.getId().equals(draft.getClientMessageId())).toBe(true);
    expect(outgoing.hasFailed()).toBe(false);
  });

  it("fails into a new instance that keeps the same draft", () => {
    const outgoing = sendingIn();

    const failed = outgoing.failed();

    expect(failed.hasFailed()).toBe(true);
    expect(outgoing.hasFailed()).toBe(false);
    expect(failed.equals(outgoing)).toBe(true);
    expect(failed.getDraft().toPrimitive()).toEqual(outgoing.getDraft().toPrimitive());
  });

  it("survives a primitive round-trip and rejects an unknown status", () => {
    const failed = sendingIn().failed();

    expect(OutgoingMessage.fromPrimitive(failed.toPrimitive()).toPrimitive()).toEqual(failed.toPrimitive());
    expect(() => OutgoingMessage.fromPrimitive({ ...failed.toPrimitive(), status: "lost" as never })).toThrow(InvalidMessageError);
  });
});

describe("OutgoingMessageList", () => {
  it("keeps the sending order and replaces a message where it was", () => {
    const [first, second] = [sendingIn(), sendingIn()];

    const list = OutgoingMessageList.empty().upsert(first).upsert(second).upsert(first.failed());

    expect(list.map((message) => message.getId().toPrimitive())).toEqual([first.getId().toPrimitive(), second.getId().toPrimitive()]);
    expect(list.find(first.getId())?.hasFailed()).toBe(true);
  });

  it("selects by room and by failure, and removes one or a whole room", () => {
    const otherRoom = RoomId.fromPrimitive(crypto.randomUUID());
    const [here, failedHere, there] = [sendingIn(), sendingIn().failed(), sendingIn(otherRoom)];
    const list = OutgoingMessageList.create([here, failedHere, there]);

    expect(list.inRoom(roomId).count()).toBe(2);
    expect(list.failed().map((message) => message.getId())).toEqual([failedHere.getId()]);
    expect(list.withoutRoom(roomId).map((message) => message.getId())).toEqual([there.getId()]);
    expect(list.remove(here.getId()).find(here.getId())).toBeNull();
    expect(list.count()).toBe(3);
  });

  it("rejects the same message twice and survives a primitive round-trip", () => {
    const message = sendingIn();

    expect(() => OutgoingMessageList.create([message, message.failed()])).toThrow(InvalidMessageError);
    const list = OutgoingMessageList.create([message]);
    expect(OutgoingMessageList.fromPrimitive(list.toPrimitive()).equals(list)).toBe(true);
  });
});
