import { afterEach, describe, expect, it } from "bun:test";
import { RequestFailedError } from "../../../shared/domain/errors/RequestFailedError.ts";
import { ApiHttp } from "../../../shared/infrastructure/ApiHttp.ts";
import { ActiveSessionId } from "../../domain/ActiveSessionId.ts";
import { Password } from "../../domain/Password.ts";
import { HttpAccountRepository } from "../../infrastructure/HttpAccountRepository.ts";
import * as ActiveSessionMother from "../helpers/ActiveSessionMother.ts";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => {
  server?.stop(true);
  server = null;
});

const sessions = [ActiveSessionMother.createPrimitive(), ActiveSessionMother.createPrimitive({ current: true })];

/** Fake backend for the security endpoints; "right" is the only current password it accepts. */
const backend = () => {
  const seen: { method: string; path: string; body: unknown }[] = [];
  server = Bun.serve({
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname;
      const body = await request.json().catch(() => null);
      seen.push({ method: request.method, path, body });
      if (path === "/api/v1/auth/password") {
        return (body as { currentPassword: string }).currentPassword === "right"
          ? new Response(null, { status: 204 })
          : Response.json({ error: "wrong", code: "auth.wrong_password" }, { status: 400 });
      }
      if (path === "/api/v1/auth/sessions") return Response.json({ sessions });
      if (path === `/api/v1/auth/sessions/${sessions[0]!.id}`) return new Response(null, { status: 204 });
      return Response.json({ error: "not found", code: "auth.session_not_found" }, { status: 404 });
    },
  });
  return { seen, accounts: new HttpAccountRepository(new ApiHttp(`http://localhost:${server.port}`)) };
};

describe("HttpAccountRepository security", () => {
  it("changes the password, and reports a wrong current one with the backend's code", async () => {
    const { accounts, seen } = backend();

    await accounts.changePassword("right", Password.create("new secret"));
    const refusal = await accounts.changePassword("wrong", Password.create("new secret")).catch((error: unknown) => error);

    expect(seen[0]?.body).toEqual({ currentPassword: "right", newPassword: "new secret" });
    expect((refusal as RequestFailedError).code).toBe("auth.wrong_password");
  });

  it("maps the session list, this device first", async () => {
    const { accounts } = backend();

    const listed = await accounts.listSessions();

    expect(listed.map((session) => session.getId().toPrimitive())).toEqual([sessions[1]!.id, sessions[0]!.id]);
  });

  it("ends a session with DELETE, and reports one that no longer exists", async () => {
    const { accounts, seen } = backend();

    await accounts.endSession(ActiveSessionId.create(sessions[0]!.id));
    const missing = await accounts.endSession(ActiveSessionId.create(crypto.randomUUID())).catch((error: unknown) => error);

    expect(seen[0]).toMatchObject({ method: "DELETE", path: `/api/v1/auth/sessions/${sessions[0]!.id}` });
    expect((missing as RequestFailedError).code).toBe("auth.session_not_found");
  });
});
