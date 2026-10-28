import { describe, expect, it } from "bun:test";
import { CurrentUser } from "../../domain/CurrentUser.ts";
import { InvalidCurrentUserError } from "../../domain/errors/InvalidCurrentUserError.ts";
import { InvalidAvatarUrlError } from "../../../user/domain/errors/InvalidAvatarUrlError.ts";
import * as CurrentUserMother from "../helpers/CurrentUserMother.ts";

const NOW = new Date("2026-11-14T12:00:00Z");

describe("CurrentUser", () => {
  it("survives a primitive round-trip", () => {
    const primitive = CurrentUserMother.createPrimitive();

    expect(CurrentUser.fromPrimitive(primitive).toPrimitive()).toEqual(primitive);
  });

  it("marks the email verified, leaving the original untouched", () => {
    const user = CurrentUserMother.unverified();

    const verified = user.markEmailVerified(NOW);

    expect(verified.isEmailVerified()).toBe(true);
    expect(verified.toPrimitive().emailVerifiedAt).toBe(NOW.toISOString());
    expect(user.isEmailVerified()).toBe(false);
  });

  it("keeps the first verification date", () => {
    const user = CurrentUserMother.create();

    expect(user.markEmailVerified(NOW)).toBe(user);
  });

  it("rejects data the backend can't have sent", () => {
    expect(() => CurrentUserMother.create({ emailVerifiedAt: "yesterday" })).toThrow(InvalidCurrentUserError);
    expect(() => CurrentUserMother.create({ avatarUrl: "javascript:alert(1)" })).toThrow(InvalidAvatarUrlError);
  });
});
