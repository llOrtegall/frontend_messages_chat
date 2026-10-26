import { describe, test, expect } from "bun:test";
import {
  canAddMembers,
  canChangeRole,
  canDeleteRoom,
  canEditMessage,
  canLeave,
  canRemoveMember,
  mergeMessages,
  upsertMessage,
  roomTitle,
  senderName,
} from "../../src/domain/rules.ts";
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
    const member = (role: "owner" | "member") => ({ userId: "me", displayName: "Me", avatarUrl: null, role, joinedAt: iso(), lastReadMessageId: null, mutedUntil: null });
    const group = room({ kind: "group", name: "G" });
    expect(canDeleteRoom({ ...group, members: [member("owner")] }, user)).toBe(true);
    expect(canDeleteRoom({ ...group, members: [member("member")] }, user)).toBe(false);
    expect(canDeleteRoom({ ...room(), members: [] }, user)).toBe(true);
  });

  test("group membership mirrors the backend rules", () => {
    const m = (userId: string, role: "owner" | "admin" | "member") =>
      ({ userId, displayName: userId, avatarUrl: null, role, joinedAt: iso(), lastReadMessageId: null, mutedUntil: null });
    const [owner, admin, admin2, plain] = [m("o", "owner"), m("a", "admin"), m("a2", "admin"), m("p", "member")];
    const g = { ...room({ kind: "group", name: "G" }), members: [owner, admin, admin2, plain] };
    const as = (id: string) => ({ ...user, id });

    expect([owner, admin, plain].map((x) => canAddMembers(g, as(x.userId)))).toEqual([true, true, false]);
    expect(canRemoveMember(g, as("o"), admin)).toBe(true);
    expect(canRemoveMember(g, as("o"), owner)).toBe(false);
    expect(canRemoveMember(g, as("a"), plain)).toBe(true);
    expect(canRemoveMember(g, as("a"), admin2)).toBe(false);
    expect(canRemoveMember(g, as("p"), admin)).toBe(false);
    expect(canChangeRole(g, as("o"), plain)).toBe(true);
    expect(canChangeRole(g, as("a"), plain)).toBe(false);
    expect(canChangeRole(g, as("o"), owner)).toBe(false);
    expect([owner, admin, plain].map((x) => canLeave(g, as(x.userId)))).toEqual([false, true, true]);

    const dm = { ...room(), members: [m("me", "member"), m("x", "member")] };
    expect(canLeave(dm, user) || canAddMembers(dm, user)).toBe(false);
    expect(senderName(g, "a")).toBe("a");
    expect(senderName(g, "gone")).toBe("Antiguo miembro");
  });

  test("titles", () => {
    expect(roomTitle({ kind: "dm", name: null })).toBe("Mensaje directo");
    expect(roomTitle({ kind: "dm", name: null, peer: { id: "x", displayName: "Bob", avatarUrl: null } })).toBe("Bob");
    expect(roomTitle({ kind: "group", name: "Team" })).toBe("Team");
  });
});
