import { describe, expect, it } from "bun:test";
import { faker } from "@faker-js/faker";
import { AvatarUrl } from "../../domain/AvatarUrl.ts";
import { DisplayName } from "../../domain/DisplayName.ts";
import { InvalidAvatarUrlError } from "../../domain/errors/InvalidAvatarUrlError.ts";
import { InvalidDisplayNameError } from "../../domain/errors/InvalidDisplayNameError.ts";
import { InvalidUserEmailError } from "../../domain/errors/InvalidUserEmailError.ts";
import { InvalidUserIdError } from "../../domain/errors/InvalidUserIdError.ts";
import { UserEmail } from "../../domain/UserEmail.ts";
import { UserId } from "../../domain/UserId.ts";

describe("UserId", () => {
  it("accepts a uuid and survives a primitive round-trip", () => {
    const id = faker.string.uuid();

    expect(UserId.fromPrimitive(id).toPrimitive()).toBe(id);
    expect(UserId.create(id).equals(UserId.create(id))).toBe(true);
  });

  it.each(["", "u1", "not-a-uuid"])("rejects %p", (value) => {
    expect(() => UserId.create(value)).toThrow(InvalidUserIdError);
  });
});

describe("UserEmail", () => {
  it("normalizes case and surrounding spaces", () => {
    expect(UserEmail.create("  Ana@Example.COM ").toPrimitive()).toBe("ana@example.com");
  });

  it.each(["", "ana", "ana@", "ana @example.com"])("rejects %p", (value) => {
    expect(() => UserEmail.create(value)).toThrow(InvalidUserEmailError);
  });
});

describe("DisplayName", () => {
  it("trims the name", () => {
    expect(DisplayName.create("  Ana  ").toPrimitive()).toBe("Ana");
  });

  it.each(["", "   ", "x".repeat(65)])("rejects %p", (value) => {
    expect(() => DisplayName.create(value)).toThrow(InvalidDisplayNameError);
  });

  it("accepts exactly 64 characters", () => {
    expect(DisplayName.create("x".repeat(64)).toPrimitive()).toHaveLength(64);
  });
});

describe("AvatarUrl", () => {
  it("accepts web addresses", () => {
    expect(AvatarUrl.create("https://cdn.example.com/a.png").toPrimitive()).toBe("https://cdn.example.com/a.png");
    expect(AvatarUrl.create("http://localhost:9000/bucket/a.png").equals(AvatarUrl.create("http://localhost:9000/bucket/a.png"))).toBe(true);
  });

  it.each(["", "a.png", "javascript:alert(1)", "data:image/png;base64,AAAA"])("rejects %p", (value) => {
    expect(() => AvatarUrl.create(value)).toThrow(InvalidAvatarUrlError);
  });
});
