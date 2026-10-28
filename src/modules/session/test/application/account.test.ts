import { describe, expect, it, mock } from "bun:test";
import { confirmEmailVerification } from "../../application/confirmEmailVerification.ts";
import { requestEmailVerification } from "../../application/requestEmailVerification.ts";
import { requestPasswordReset } from "../../application/requestPasswordReset.ts";
import { resetPassword } from "../../application/resetPassword.ts";
import { updateProfile } from "../../application/updateProfile.ts";
import { EmptyAttachmentError } from "../../../attachment/domain/errors/EmptyAttachmentError.ts";
import { InvalidEmailTokenError } from "../../domain/errors/InvalidEmailTokenError.ts";
import { InvalidPasswordError } from "../../domain/errors/InvalidPasswordError.ts";
import * as AttachmentMother from "../../../attachment/test/helpers/AttachmentMother.ts";
import * as AttachmentRepositoryMother from "../../../attachment/test/helpers/AttachmentRepositoryMother.ts";
import * as AccountRepositoryMother from "../helpers/AccountRepositoryMother.ts";
import * as CurrentUserMother from "../helpers/CurrentUserMother.ts";

describe("updateProfile", () => {
  const setUp = () => {
    const key = AttachmentMother.key();
    const saved = CurrentUserMother.create();
    const dependencies = {
      accountRepository: AccountRepositoryMother.create({ updateProfile: mock(async () => saved) }),
      attachmentRepository: AttachmentRepositoryMother.create({ upload: mock(async () => key) }),
    };
    return { key, saved, dependencies, update: updateProfile(dependencies) };
  };

  it("uploads the new picture first and sends only what changed", async () => {
    const { key, saved, dependencies, update } = setUp();
    const current = CurrentUserMother.create({ displayName: "Ana" });

    const updated = await update(current, { displayName: "Ana", avatar: AttachmentMother.content() });

    const [changes] = dependencies.accountRepository.updateProfile.mock.calls[0]!;
    expect(changes.toPrimitive()).toEqual({ avatarKey: key.toPrimitive() });
    expect(updated).toBe(saved);
  });

  it("asks nothing of the backend when nothing changed", async () => {
    const { dependencies, update } = setUp();
    const current = CurrentUserMother.create({ displayName: "Ana" });

    expect(await update(current, { displayName: " Ana " })).toBe(current);
    expect(dependencies.accountRepository.updateProfile).not.toHaveBeenCalled();
    expect(dependencies.attachmentRepository.upload).not.toHaveBeenCalled();
  });

  it("changes nothing when the picture can't be uploaded", async () => {
    const { dependencies, update } = setUp();

    await expect(update(CurrentUserMother.create(), { displayName: "Ana", avatar: new Blob([], { type: "image/png" }) })).rejects.toThrow(
      EmptyAttachmentError,
    );
    expect(dependencies.accountRepository.updateProfile).not.toHaveBeenCalled();
  });
});

describe("emailed-token flows", () => {
  it("confirms a verification token, and refuses an empty one", async () => {
    const accountRepository = AccountRepositoryMother.create();
    const confirm = confirmEmailVerification({ accountRepository });

    await confirm("token-123");
    await expect(confirm("")).rejects.toThrow(InvalidEmailTokenError);

    expect(accountRepository.confirmEmailVerification.mock.calls.map(([token]) => token.toPrimitive())).toEqual(["token-123"]);
  });

  it("asks for another verification email and for a reset link", async () => {
    const accountRepository = AccountRepositoryMother.create();

    await requestEmailVerification({ accountRepository })();
    await requestPasswordReset({ accountRepository })(" Ana@Example.com ");

    expect(accountRepository.requestEmailVerification).toHaveBeenCalledTimes(1);
    expect(accountRepository.requestPasswordReset.mock.calls[0]![0].toPrimitive()).toBe("ana@example.com");
  });

  it("resets the password with a valid new one only", async () => {
    const accountRepository = AccountRepositoryMother.create();
    const reset = resetPassword({ accountRepository });

    await reset("token-123", "a-new-password");
    await expect(reset("token-123", "short")).rejects.toThrow(InvalidPasswordError);

    expect(accountRepository.resetPassword).toHaveBeenCalledTimes(1);
    const [token, password] = accountRepository.resetPassword.mock.calls[0]!;
    expect([token.toPrimitive(), password.toPrimitive()]).toEqual(["token-123", "a-new-password"]);
  });
});
