import { describe, expect, it } from "bun:test";
import { InvalidUserError } from "../../domain/errors/InvalidUserError.ts";
import { InvalidUserSearchError } from "../../domain/errors/InvalidUserSearchError.ts";
import { User } from "../../domain/User.ts";
import { UserList } from "../../domain/UserList.ts";
import { UserPage } from "../../domain/UserPage.ts";
import { UserSearch } from "../../domain/UserSearch.ts";
import * as UserMother from "../helpers/UserMother.ts";

describe("User", () => {
  it("survives a primitive round-trip", () => {
    const primitive = UserMother.createPrimitive();

    expect(User.fromPrimitive(primitive).toPrimitive()).toEqual(primitive);
  });
});

describe("UserList", () => {
  it("rejects the same user twice", () => {
    const user = UserMother.create();

    expect(() => UserList.create([user, user])).toThrow(InvalidUserError);
  });

  it("appends a next page keeping who was already listed in place, leaving the original untouched", () => {
    const [ana, ben, cat] = [UserMother.create(), UserMother.create(), UserMother.create()];
    const firstPage = UserList.create([ana, ben]);

    const both = firstPage.append(UserList.create([ben, cat]));

    expect(both.map((user) => user.getId())).toEqual([ana.getId(), ben.getId(), cat.getId()]);
    expect(firstPage.count()).toBe(2);
  });

  it("leaves out the users it is told to", () => {
    const [ana, ben] = [UserMother.create(), UserMother.create()];

    const rest = UserList.create([ana, ben]).excluding([ana.getId()]);

    expect(rest.includes(ana.getId())).toBe(false);
    expect(rest.includes(ben.getId())).toBe(true);
  });

  it("counts who matches and survives a primitive round-trip", () => {
    const list = UserList.create([UserMother.create({ isOnline: true }), UserMother.create({ isOnline: false })]);

    expect(list.countWhere((user) => user.isOnline())).toBe(1);
    expect(UserList.fromPrimitive(list.toPrimitive()).equals(list)).toBe(true);
    expect(UserList.empty().isEmpty()).toBe(true);
  });
});

describe("UserSearch", () => {
  it("trims the query and keeps the cursor", () => {
    expect(UserSearch.fromPrimitive({ query: "  ana ", cursor: "abc" }).toPrimitive()).toEqual({ query: "ana", cursor: "abc" });
  });

  it("rejects a query over 100 characters and an empty cursor", () => {
    expect(() => UserSearch.fromPrimitive({ query: "x".repeat(101), cursor: null })).toThrow(InvalidUserSearchError);
    expect(() => UserSearch.fromPrimitive({ query: "ana", cursor: "" })).toThrow(InvalidUserSearchError);
  });
});

describe("UserPage", () => {
  it("has more only while there is a next cursor", () => {
    const users = UserMother.list(2).toPrimitive();

    expect(UserPage.fromPrimitive({ users, nextCursor: "next" }).hasMore()).toBe(true);
    expect(UserPage.fromPrimitive({ users, nextCursor: null }).hasMore()).toBe(false);
  });
});
