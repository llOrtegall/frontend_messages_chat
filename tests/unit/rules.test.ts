import { describe, test, expect } from "bun:test";
import { mergeMessages, upsertMessage, roomTitle } from "../../src/domain/rules.ts";
import { message } from "../fakes.ts";

describe("domain rules", () => {
  test("upsert and merge keep messages sorted and unique", () => {
    const [a, b, c] = [message("r"), message("r"), message("r")];
    expect(upsertMessage([a, c], b).map((m) => m.id)).toEqual([a.id, b.id, c.id]);
    expect(upsertMessage([a, b], { ...a, body: "x" })[0]!.body).toBe("x");
    expect(mergeMessages([b, c], [a, b]).map((m) => m.id)).toEqual([a.id, b.id, c.id]);
  });

  test("titles", () => {
    expect(roomTitle({ kind: "dm", name: null })).toBe("Mensaje directo");
    expect(roomTitle({ kind: "dm", name: null, peer: { id: "x", displayName: "Bob", avatarUrl: null } })).toBe("Bob");
    expect(roomTitle({ kind: "group", name: "Team" })).toBe("Team");
  });
});
