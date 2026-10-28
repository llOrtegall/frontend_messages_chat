import { afterEach, describe, expect, it } from "bun:test";
import { ApiHttp } from "../../../shared/infrastructure/ApiHttp.ts";
import { DisplayName } from "../../../user/domain/DisplayName.ts";
import { UserEmail } from "../../../user/domain/UserEmail.ts";
import { HttpAccountRepository } from "../../infrastructure/HttpAccountRepository.ts";
import { HttpSessionRepository } from "../../infrastructure/HttpSessionRepository.ts";
import { Password } from "../../domain/Password.ts";
import { EmailToken } from "../../domain/EmailToken.ts";
import * as CurrentUserMother from "../helpers/CurrentUserMother.ts";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => {
  server?.stop(true);
  server = null;
});

const user = CurrentUserMother.createPrimitive();

/** Fake backend: sign-in hands out "token"; /auth/me and /users/me need it; logout may fail. */
const backend = (options: { hasSession?: boolean; logoutStatus?: number } = {}) => {
  const seen: { path: string; authorization: string | null; body: unknown }[] = [];
  server = Bun.serve({
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname;
      const body = await request.json().catch(() => null);
      seen.push({ path, authorization: request.headers.get("authorization"), body });
      const signedIn = request.headers.get("authorization") === "Bearer token";
      switch (path) {
        case "/api/v1/auth/login":
        case "/api/v1/auth/register":
          return Response.json({ user, accessToken: "token" }, { status: path.endsWith("register") ? 201 : 200 });
        case "/api/v1/auth/refresh":
          return options.hasSession
            ? Response.json({ accessToken: "token" })
            : Response.json({ error: "no session", code: "auth.invalid_refresh_token" }, { status: 401 });
        case "/api/v1/auth/me":
        case "/api/v1/users/me":
          return signedIn ? Response.json({ user }) : Response.json({ error: "no", code: "auth.unauthenticated" }, { status: 401 });
        case "/api/v1/auth/logout":
          return new Response(null, { status: options.logoutStatus ?? 204 });
        default:
          return new Response(null, { status: 204 });
      }
    },
  });
  const http = new ApiHttp(`http://localhost:${server.port}`);
  return { seen, http, sessions: new HttpSessionRepository(http), accounts: new HttpAccountRepository(http) };
};

describe("HttpSessionRepository", () => {
  it("keeps the access token it signs in with for the next requests", async () => {
    const { sessions, accounts, seen } = backend();

    const signedIn = await sessions.signUp(UserEmail.create(user.email), Password.create("password123"), DisplayName.create("Ana"));
    await accounts.requestEmailVerification();

    expect(signedIn.toPrimitive()).toEqual(user);
    expect(seen.at(-1)).toMatchObject({ path: "/api/v1/auth/verify-email/request", authorization: "Bearer token" });
  });

  it("restores the user from the refresh cookie, or nobody when there is no session", async () => {
    expect((await backend({ hasSession: true }).sessions.restore())?.toPrimitive()).toEqual(user);
    server?.stop(true);
    expect(await backend().sessions.restore()).toBeNull();
  });

  it("forgets the access token on sign-out even when the backend can't be told", async () => {
    const { sessions, accounts, seen } = backend({ logoutStatus: 500 });
    await sessions.signIn(UserEmail.create(user.email), "password123");

    await expect(sessions.signOut()).rejects.toThrow();
    await accounts.requestEmailVerification().catch(() => {});

    expect(seen.at(-1)?.authorization).toBeNull();
  });
});

describe("HttpAccountRepository", () => {
  it("resets the password without trying to renew a session, then forgets the access token", async () => {
    const { sessions, accounts, seen } = backend();
    await sessions.signIn(UserEmail.create(user.email), "password123");

    await accounts.resetPassword(EmailToken.create("t"), Password.create("a-new-password"));
    await accounts.requestEmailVerification().catch(() => {});

    expect(seen.find((request) => request.path === "/api/v1/auth/password-reset/confirm")?.body).toEqual({ token: "t", newPassword: "a-new-password" });
    expect(seen.at(-1)?.authorization).toBeNull();
  });
});
