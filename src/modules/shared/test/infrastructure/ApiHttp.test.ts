import { afterEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { RequestFailedError } from "../../domain/errors/RequestFailedError.ts";
import { ApiHttp } from "../../infrastructure/ApiHttp.ts";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => {
  server?.stop(true);
  server = null;
});

/** Fake backend: /refresh hands out "fresh" tokens; /data needs Bearer fresh. */
const backend = (options: { refreshOk?: boolean; dataBody?: unknown } = {}) => {
  const calls = { refresh: 0, data: 0 };
  server = Bun.serve({
    port: 0,
    async fetch(request) {
      if (new URL(request.url).pathname === "/api/v1/auth/refresh") {
        calls.refresh++;
        await Bun.sleep(20);
        return options.refreshOk === false
          ? Response.json({ error: "Invalid refresh token", code: "auth.invalid_refresh_token" }, { status: 401 })
          : Response.json({ accessToken: "fresh" });
      }
      calls.data++;
      if (request.headers.get("authorization") !== "Bearer fresh") {
        return Response.json({ error: "Unauthorized", code: "auth.unauthenticated" }, { status: 401 });
      }
      return Response.json(options.dataBody ?? { value: 42 });
    },
  });
  const http = new ApiHttp(`http://localhost:${server.port}`);
  http.setAccessToken("fresh");
  return { calls, http };
};

const Data = z.strictObject({ value: z.number() });

const silencingConsole = async <T>(action: () => Promise<T>): Promise<T> => {
  const original = console.error;
  console.error = () => {};
  try {
    return await action();
  } finally {
    console.error = original;
  }
};

describe("ApiHttp", () => {
  describe("Basic behaviour", () => {
    it("refreshes once on 401 and retries; concurrent 401s share one refresh", async () => {
      const { calls, http } = backend();
      http.setAccessToken("stale");

      const results = await Promise.all([1, 2, 3].map(() => http.request("GET", "/data", Data)));

      expect(results).toEqual([{ value: 42 }, { value: 42 }, { value: 42 }]);
      expect(calls.refresh).toBe(1);
    });

    it("ignores fields a newer backend added", async () => {
      const { http } = backend({ dataBody: { value: 42, addedLater: true } });

      expect(await http.request("GET", "/data", Data)).toEqual({ value: 42 });
    });
  });

  describe("Error scenarios", () => {
    it("notifies expiry and fails with the backend's code when the session can't be renewed", async () => {
      const { http } = backend({ refreshOk: false });
      http.setAccessToken("stale");
      let expired = 0;
      http.onExpired(() => expired++);

      const error = await http.request("GET", "/data", Data).catch((failure: unknown) => failure);

      expect(error).toBeInstanceOf(RequestFailedError);
      expect((error as RequestFailedError).code).toBe("auth.unauthenticated");
      expect((error as RequestFailedError).status).toBe(401);
      expect(expired).toBe(1);
    });

    it("rejects a response that breaks the contract", async () => {
      const { http } = backend({ dataBody: { value: "nope" } });

      const error = await silencingConsole(() => http.request("GET", "/data", Data).catch((failure: unknown) => failure));

      expect((error as RequestFailedError).code).toBe(RequestFailedError.UNEXPECTED_RESPONSE);
    });

    it("reports an unreachable backend as a network failure", async () => {
      const http = new ApiHttp("http://localhost:1");

      const error = await http.request("GET", "/data", Data).catch((failure: unknown) => failure);

      expect((error as RequestFailedError).code).toBe(RequestFailedError.NETWORK);
      expect((error as RequestFailedError).status).toBeNull();
    });
  });
});
