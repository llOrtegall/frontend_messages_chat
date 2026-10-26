import { describe, test, expect, afterEach } from "bun:test";
import { z } from "zod";
import { ApiError, HttpClient } from "../../src/infrastructure/http/http-client.ts";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => { server?.stop(true); server = null; });

/** Fake backend: /refresh hands out "fresh" tokens; /data needs Bearer fresh. */
function backend(opts: { refreshOk?: boolean; dataBody?: unknown } = {}) {
  const calls = { refresh: 0, data: 0 };
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === "/api/v1/auth/refresh") {
        calls.refresh++;
        await Bun.sleep(20);
        return opts.refreshOk === false
          ? Response.json({ error: "Invalid refresh token" }, { status: 401 })
          : Response.json({ accessToken: "fresh" });
      }
      calls.data++;
      if (req.headers.get("authorization") !== "Bearer fresh") return Response.json({ error: "Unauthorized" }, { status: 401 });
      return Response.json(opts.dataBody ?? { value: 42 });
    },
  });
  return { calls, client: new HttpClient(`http://localhost:${server.port}`) };
}

const Data = z.strictObject({ value: z.number() });

describe("HttpClient", () => {
  test("refreshes once on 401 and retries; concurrent 401s share one refresh", async () => {
    const { calls, client } = backend();
    client.setAccessToken("stale");
    const results = await Promise.all([1, 2, 3].map(() => client.request("GET", "/data", Data)));
    expect(results).toEqual([{ value: 42 }, { value: 42 }, { value: 42 }]);
    expect(calls.refresh).toBe(1);
  });

  test("when the refresh fails it notifies expiry and throws 401", async () => {
    const { client } = backend({ refreshOk: false });
    let expired = 0;
    client.onExpired(() => expired++);
    const err = await client.request("GET", "/data", Data).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.message).toBe("Unauthorized");
    expect(expired).toBe(1);
  });

  test("rejects responses that break the contract", async () => {
    const { client } = backend({ dataBody: { value: "nope" } });
    client.setAccessToken("fresh");
    const orig = console.error;
    console.error = () => {};
    try {
      const err = await client.request("GET", "/data", Data).catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.message).toBe("Respuesta inesperada del servidor");
    } finally {
      console.error = orig;
    }
  });
});
