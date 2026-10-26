import { describe, test, expect } from "bun:test";
import { SessionStore } from "../../src/application/session-store.ts";
import type { AuthGateway } from "../../src/domain/ports.ts";
import type { CurrentUser } from "../../src/domain/entities.ts";
import { FakeAttachments } from "../fakes.ts";

const attachments = new FakeAttachments();

const alice: CurrentUser = { id: "u1", email: "a@x.com", displayName: "Alice", avatarUrl: null, emailVerifiedAt: null };

function fakeAuth(restored: CurrentUser | null) {
  let expired: () => void = () => {};
  const calls = { restore: 0, logout: 0, verify: 0, reset: [] as string[], profile: [] as unknown[] };
  const auth: AuthGateway = {
    login: async () => alice,
    register: async () => alice,
    restore: async () => { calls.restore++; return restored; },
    logout: async () => { calls.logout++; },
    onExpired: (l) => { expired = l; return () => {}; },
    me: async () => ({ ...alice, emailVerifiedAt: "2026-01-01T00:00:00.000Z" }),
    verifyEmail: async () => { calls.verify++; },
    resendVerification: async () => {},
    requestPasswordReset: async () => {},
    resetPassword: async (token) => { calls.reset.push(token); },
    updateProfile: async (changes) => { calls.profile.push(changes); return { ...alice, displayName: changes.displayName ?? alice.displayName, avatarUrl: changes.avatarKey ? `https://cdn/${changes.avatarKey}` : null }; },
  };
  return { auth, calls, expire: () => expired() };
}

describe("SessionStore", () => {
  test("restore is idempotent and resolves to authenticated or anonymous", async () => {
    const { auth, calls } = fakeAuth(alice);
    const store = new SessionStore(auth, attachments);
    expect(store.getSnapshot().status).toBe("loading");
    await Promise.all([store.restore(), store.restore()]);
    expect(calls.restore).toBe(1);
    expect(store.getSnapshot()).toEqual({ status: "authenticated", user: alice });

    const anon = new SessionStore(fakeAuth(null).auth, attachments);
    await anon.restore();
    expect(anon.getSnapshot().status).toBe("anonymous");
  });

  test("login, expiry and logout", async () => {
    const { auth, calls, expire } = fakeAuth(null);
    const store = new SessionStore(auth, attachments);
    await store.login("a@x.com", "pw");
    expect(store.getSnapshot().user).toEqual(alice);

    expire();
    expect(store.getSnapshot().status).toBe("anonymous");

    await store.login("a@x.com", "pw");
    await store.logout();
    expect(calls.logout).toBe(1);
    expect(store.getSnapshot().status).toBe("anonymous");
  });

  test("verifying an email redeems the token once and refreshes the signed-in user", async () => {
    const { auth, calls } = fakeAuth(alice);
    const store = new SessionStore(auth, attachments);
    await store.restore();
    await Promise.all([store.verifyEmail("t1"), store.verifyEmail("t1")]);
    expect(calls.verify).toBe(1);
    expect(store.getSnapshot().user?.emailVerifiedAt).not.toBeNull();
  });

  test("a password reset ends the local session", async () => {
    const { auth, calls } = fakeAuth(alice);
    const store = new SessionStore(auth, attachments);
    await store.restore();
    await store.resetPassword("t2", "newpassword");
    expect(calls.reset).toEqual(["t2"]);
    expect(store.getSnapshot().status).toBe("anonymous");
  });

  test("profile: uploads a new avatar first; null removes it", async () => {
    const { auth, calls } = fakeAuth(alice);
    const store = new SessionStore(auth, attachments);
    await store.restore();
    await store.updateProfile({ displayName: "  Ali  ", avatar: new Blob(["x"], { type: "image/png" }) });
    expect(store.getSnapshot().user).toMatchObject({ displayName: "Ali", avatarUrl: expect.stringContaining("uploads/") });
    await store.updateProfile({ avatar: null });
    expect(calls.profile).toEqual([
      { displayName: "Ali", avatarKey: expect.stringContaining("uploads/") },
      { displayName: undefined, avatarKey: null },
    ]);
    expect(store.getSnapshot().user?.avatarUrl).toBeNull();
  });
});
