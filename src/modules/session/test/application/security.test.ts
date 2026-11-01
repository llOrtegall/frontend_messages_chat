import { describe, expect, it, mock } from "bun:test";
import { changePassword } from "../../application/changePassword.ts";
import { endSession } from "../../application/endSession.ts";
import { listActiveSessions } from "../../application/listActiveSessions.ts";
import { ActiveSessionList } from "../../domain/ActiveSessionList.ts";
import { InvalidActiveSessionError } from "../../domain/errors/InvalidActiveSessionError.ts";
import { InvalidPasswordError } from "../../domain/errors/InvalidPasswordError.ts";
import * as AccountRepositoryMother from "../helpers/AccountRepositoryMother.ts";
import * as ActiveSessionMother from "../helpers/ActiveSessionMother.ts";

describe("changePassword", () => {
  it("sends the current password as typed with the new one", async () => {
    const accountRepository = AccountRepositoryMother.create();

    await changePassword({ accountRepository })({ currentPassword: "old secret", newPassword: "new secret" });

    const [current, chosen] = accountRepository.changePassword.mock.calls[0]!;
    expect([current, chosen.toPrimitive()]).toEqual(["old secret", "new secret"]);
  });

  it("refuses a new password of the wrong length without asking the backend", async () => {
    const accountRepository = AccountRepositoryMother.create();

    await expect(changePassword({ accountRepository })({ currentPassword: "old secret", newPassword: "short" })).rejects.toThrow(InvalidPasswordError);
    expect(accountRepository.changePassword).not.toHaveBeenCalled();
  });
});

describe("active sessions", () => {
  it("lists the devices the user is signed in with", async () => {
    const sessions = ActiveSessionList.create([ActiveSessionMother.current(), ActiveSessionMother.create()]);
    const accountRepository = AccountRepositoryMother.create({ listSessions: mock(async () => sessions) });

    expect((await listActiveSessions({ accountRepository })()).equals(sessions)).toBe(true);
  });

  it("ends a session by its id and refuses an id that is not one", async () => {
    const accountRepository = AccountRepositoryMother.create();
    const session = ActiveSessionMother.create();

    await endSession({ accountRepository })(session.getId().toPrimitive());

    expect(accountRepository.endSession.mock.calls[0]![0].equals(session.getId())).toBe(true);
    await expect(endSession({ accountRepository })("s1")).rejects.toThrow(InvalidActiveSessionError);
  });
});
