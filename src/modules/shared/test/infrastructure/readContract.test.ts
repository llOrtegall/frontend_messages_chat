import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { readContract } from "../../infrastructure/readContract.ts";

const Member = z.strictObject({ id: z.string(), role: z.enum(["owner", "member"]) });
const Room = z.strictObject({ id: z.string(), members: z.array(Member) });
const Frame = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("room.added"), payload: z.strictObject({ room: Room }) }),
  z.strictObject({ type: z.literal("pong") }),
]);

describe("readContract", () => {
  it("drops fields the contract doesn't know, at any depth", () => {
    const data = { id: "r1", topic: "new", members: [{ id: "u1", role: "owner", mutedUntil: null }] };

    const result = readContract(Room, data);

    expect(result.success && result.data).toEqual({ id: "r1", members: [{ id: "u1", role: "owner" }] });
    expect(data.topic).toBe("new");
  });

  it("drops unknown fields inside a discriminated union", () => {
    const result = readContract(Frame, { type: "room.added", payload: { room: { id: "r1", members: [], extra: 1 } }, seq: 7 });

    expect(result.success && result.data).toEqual({ type: "room.added", payload: { room: { id: "r1", members: [] } } });
  });

  it("still rejects a missing or mistyped known field", () => {
    expect(readContract(Room, { id: "r1", extra: true }).success).toBe(false);
    expect(readContract(Room, { id: "r1", members: [{ id: "u1", role: "guest" }] }).success).toBe(false);
  });

  it("still rejects an unknown kind of frame", () => {
    expect(readContract(Frame, { type: "room.renamed" }).success).toBe(false);
  });
});
