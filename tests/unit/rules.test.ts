import { describe, test, expect } from "bun:test";
import { canDeleteRoom, canEditMessage, mergeMessages, upsertMessage, roomTitle } from "../../src/domain/rules.ts";
import { iso, message, room } from "../fakes.ts";

const user = { id: "me", email: "me@x.com", displayName: "Me", avatarUrl: null, emailVerifiedAt: null };

describe("domain rules", () => {
  test("upsert and merge keep messages sorted and unique", () => {
    const [a, b, c] = [message("r"), message("r"), message("r")];
    expect(upsertMessage([a, c], b).map((m) => m.id)).toEqual([a.id, b.id, c.id]);
    expect(upsertMessage([a, b], { ...a, body: "x" })[0]!.body).toBe("x");
    expect(mergeMessages([b, c], [a, b]).map((m) => m.id)).toEqual([a.id, b.id, c.id]);
  });

  test("permissions", () => {
    expect(canEditMessage(message("r", { senderId: "me" }), user)).toBe(true);
    expect(canEditMessage(message("r", { senderId: "other" }), user)).toBe(false);
    const member = (role: "owner" | "member") => ({ userId: "me", role, joinedAt: iso(), lastReadMessageId: null, mutedUntil: null });
    const group = room({ kind: "group", name: "G" });
    expect(canDeleteRoom({ ...group, members: [member("owner")] }, user)).toBe(true);
    expect(canDeleteRoom({ ...group, members: [member("member")] }, user)).toBe(false);
    expect(canDeleteRoom({ ...room(), members: [] }, user)).toBe(true);
  });

  test("titles", () => {
    expect(roomTitle({ kind: "dm", name: null })).toBe("Mensaje directo");
    expect(roomTitle({ kind: "group", name: "Team" })).toBe("Team");
  });
});
