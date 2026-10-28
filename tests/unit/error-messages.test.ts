import { describe, expect, test } from "bun:test";
import { messageFor } from "../../src/i18n/errorMessages.ts";
import { RequestFailedError } from "../../src/modules/shared/domain/errors/RequestFailedError.ts";

describe("messageFor", () => {
  test("words a failure by its code", () => {
    expect(messageFor(new RequestFailedError("auth.invalid_credentials", 401), "session.login")).toBe("Email o contraseña incorrectos.");
  });

  test("falls back to what the action couldn't do for generic or unknown failures", () => {
    expect(messageFor(new RequestFailedError("internal", 500), "message.send")).toBe("No se pudo enviar el mensaje.");
    expect(messageFor(new RequestFailedError("some.future_code", 400), "message.send")).toBe("No se pudo enviar el mensaje.");
    expect(messageFor(new TypeError("boom"), "rooms.load")).toBe("No se pudieron cargar las conversaciones.");
  });

  test("has a generic text when nothing else applies", () => {
    expect(messageFor(new Error("boom"))).toBe("Algo salió mal. Inténtalo de nuevo.");
  });
});
