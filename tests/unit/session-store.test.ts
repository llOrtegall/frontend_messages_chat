import { describe, test, expect } from "bun:test";
import { SessionStore } from "../../src/application/session-store.ts";
import type { AuthGateway } from "../../src/domain/ports.ts";
import type { CurrentUser } from "../../src/domain/entities.ts";

const alice: CurrentUser = { id: "u1", email: "a@x.com", displayName: "Alice", avatarUrl: null, emailVerifiedAt: null };

function fakeAuth(restored: CurrentUser | null) {
  let expired: () => void = () => {};
  const calls = { restore: 0, logout: 0 };
  const auth: AuthGateway = {
    login: async () => alice,
    register: async () => alice,
    restore: async () => { calls.restore++; return restored; },
    logout: async () => { calls.logout++; },
    onExpired: (l) => { expired = l; return () => {}; },
  };
  return { auth, calls, expire: () => expired() };
}

describe("SessionStore", () => {
  test("restore is idempotent and resolves to authenticated or anonymous", async () => {
    const { auth, calls } = fakeAuth(alice);
    const store = new SessionStore(auth);
    expect(store.getSnapshot().status).toBe("loading");
    await Promise.all([store.restore(), store.restore()]);
    expect(calls.restore).toBe(1);
    expect(store.getSnapshot()).toEqual({ status: "authenticated", user: alice });

    const anon = new SessionStore(fakeAuth(null).auth);
    await anon.restore();
    expect(anon.getSnapshot().status).toBe("anonymous");
  });

  test("login, expiry and logout", async () => {
    const { auth, calls, expire } = fakeAuth(null);
    const store = new SessionStore(auth);
    await store.login("a@x.com", "pw");
    expect(store.getSnapshot().user).toEqual(alice);

    expire();
    expect(store.getSnapshot().status).toBe("anonymous");

    await store.login("a@x.com", "pw");
    await store.logout();
    expect(calls.logout).toBe(1);
    expect(store.getSnapshot().status).toBe("anonymous");
  });
});
