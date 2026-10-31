import { describe, expect, it } from "bun:test";
import { RequestFailedError } from "../../domain/errors/RequestFailedError.ts";

describe("RequestFailedError", () => {
  it("tells a request that got no answer from one the backend refused", () => {
    const unanswered = [RequestFailedError.NETWORK, RequestFailedError.DISCONNECTED, RequestFailedError.TIMEOUT];

    expect(unanswered.map((code) => new RequestFailedError(code, null).isConnectionLost())).toEqual([true, true, true]);
    expect(new RequestFailedError("room.not_member", null).isConnectionLost()).toBe(false);
    expect(new RequestFailedError(RequestFailedError.FAILED, 500).isConnectionLost()).toBe(false);
  });
});
