import { describe, expect, it } from "bun:test";
import { AttachmentKey } from "../../../attachment/domain/AttachmentKey.ts";
import { DisplayName } from "../../../user/domain/DisplayName.ts";
import { EmailToken } from "../../domain/EmailToken.ts";
import { InvalidEmailTokenError } from "../../domain/errors/InvalidEmailTokenError.ts";
import { InvalidPasswordError } from "../../domain/errors/InvalidPasswordError.ts";
import { Password } from "../../domain/Password.ts";
import { ProfileChanges } from "../../domain/ProfileChanges.ts";
import * as CurrentUserMother from "../helpers/CurrentUserMother.ts";

describe("Password", () => {
  it("accepts 8 to 128 characters", () => {
    expect(Password.create("12345678").toPrimitive()).toBe("12345678");
    expect(Password.create("x".repeat(128)).toPrimitive()).toHaveLength(128);
  });

  it.each(["", "1234567", "x".repeat(129)])("rejects a password of length %#", (value) => {
    expect(() => Password.create(value)).toThrow(InvalidPasswordError);
  });
});

describe("EmailToken", () => {
  it("survives a primitive round-trip", () => {
    expect(EmailToken.fromPrimitive("abc").equals(EmailToken.create("abc"))).toBe(true);
  });

  it.each(["", "t".repeat(513)])("rejects a token of length %#", (value) => {
    expect(() => EmailToken.create(value)).toThrow(InvalidEmailTokenError);
  });
});

describe("ProfileChanges", () => {
  const user = CurrentUserMother.create({ displayName: "Ana" });
  const newKey = AttachmentKey.create("uploads/u/new.png");

  it("keeps only what differs from the current profile", () => {
    const changes = ProfileChanges.between(user, { displayName: DisplayName.create("Ana B."), avatarKey: newKey });

    expect(changes.toPrimitive()).toEqual({ displayName: "Ana B.", avatarKey: "uploads/u/new.png" });
  });

  it("is empty when the name is the same and the picture is kept", () => {
    expect(ProfileChanges.between(user, { displayName: DisplayName.create(" Ana ") }).isEmpty()).toBe(true);
  });

  it("asks to remove the picture only when there is one", () => {
    const removal = { displayName: DisplayName.create("Ana"), avatarKey: null };

    expect(ProfileChanges.between(user, removal).toPrimitive()).toEqual({ avatarKey: null });
    expect(ProfileChanges.between(CurrentUserMother.withoutPicture(), { ...removal, displayName: DisplayName.create("x") }).toPrimitive()).toEqual({
      displayName: "x",
    });
  });

  it("survives a primitive round-trip", () => {
    const changes = ProfileChanges.fromPrimitive({ displayName: "Ana", avatarKey: null });

    expect(ProfileChanges.fromPrimitive(changes.toPrimitive()).equals(changes)).toBe(true);
  });
});
