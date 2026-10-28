import { describe, expect, it, mock } from "bun:test";
import { restoreSession } from "../../application/restoreSession.ts";
import { signIn } from "../../application/signIn.ts";
import { signOut } from "../../application/signOut.ts";
import { signUp } from "../../application/signUp.ts";
import { watchSessionExpiry } from "../../application/watchSessionExpiry.ts";
import { InvalidPasswordError } from "../../domain/errors/InvalidPasswordError.ts";
import { InvalidDisplayNameError } from "../../../user/domain/errors/InvalidDisplayNameError.ts";
import { InvalidUserEmailError } from "../../../user/domain/errors/InvalidUserEmailError.ts";
import * as CurrentUserMother from "../helpers/CurrentUserMother.ts";
import * as SessionRepositoryMother from "../helpers/SessionRepositoryMother.ts";

describe("signIn", () => {
  it("signs in with a normalized email and returns the user", async () => {
    const user = CurrentUserMother.create();
    const sessionRepository = SessionRepositoryMother.create({ signIn: mock(async () => user) });

    const signedIn = await signIn({ sessionRepository })({ email: " Ana@Example.com", password: "whatever" });

    expect(signedIn).toBe(user);
    const [email, password] = sessionRepository.signIn.mock.calls[0]!;
    expect(email.toPrimitive()).toBe("ana@example.com");
    expect(password).toBe("whatever");
  });

  it("doesn't ask the backend about a malformed email", async () => {
    const sessionRepository = SessionRepositoryMother.create();

    await expect(signIn({ sessionRepository })({ email: "ana", password: "x" })).rejects.toThrow(InvalidUserEmailError);
    expect(sessionRepository.signIn).not.toHaveBeenCalled();
  });
});

describe("signUp", () => {
  it("creates the account with valid values", async () => {
    const sessionRepository = SessionRepositoryMother.create();

    await signUp({ sessionRepository })({ email: "ana@example.com", password: "password123", displayName: " Ana " });

    const [email, password, displayName] = sessionRepository.signUp.mock.calls[0]!;
    expect([email.toPrimitive(), password.toPrimitive(), displayName.toPrimitive()]).toEqual(["ana@example.com", "password123", "Ana"]);
  });

  it("refuses a short password or an empty name before calling the backend", async () => {
    const sessionRepository = SessionRepositoryMother.create();
    const register = signUp({ sessionRepository });

    await expect(register({ email: "ana@example.com", password: "short", displayName: "Ana" })).rejects.toThrow(InvalidPasswordError);
    await expect(register({ email: "ana@example.com", password: "password123", displayName: " " })).rejects.toThrow(InvalidDisplayNameError);
    expect(sessionRepository.signUp).not.toHaveBeenCalled();
  });
});

describe("restoreSession, signOut and watchSessionExpiry", () => {
  it("restores the user the refresh cookie still holds, or nobody", async () => {
    const user = CurrentUserMother.create();

    expect(await restoreSession({ sessionRepository: SessionRepositoryMother.create({ restore: mock(async () => user) }) })()).toBe(user);
    expect(await restoreSession({ sessionRepository: SessionRepositoryMother.create() })()).toBeNull();
  });

  it("signs out", async () => {
    const sessionRepository = SessionRepositoryMother.create();

    await signOut({ sessionRepository })();

    expect(sessionRepository.signOut).toHaveBeenCalledTimes(1);
  });

  it("subscribes to the end of the session and hands back the unsubscribe", () => {
    const unsubscribe = () => {};
    const sessionRepository = SessionRepositoryMother.create({ onExpired: mock(() => unsubscribe) });
    const onExpired = () => {};

    expect(watchSessionExpiry({ sessionRepository })(onExpired)).toBe(unsubscribe);
    expect(sessionRepository.onExpired.mock.calls[0]![0]).toBe(onExpired);
  });
});
