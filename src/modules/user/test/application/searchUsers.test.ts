import { describe, expect, it, mock } from "bun:test";
import { searchUsers } from "../../application/searchUsers.ts";
import { InvalidUserSearchError } from "../../domain/errors/InvalidUserSearchError.ts";
import { UserPage } from "../../domain/UserPage.ts";
import * as UserMother from "../helpers/UserMother.ts";
import * as UserRepositoryMother from "../helpers/UserRepositoryMother.ts";

describe("searchUsers", () => {
  it("returns the page the directory gives for the trimmed query", async () => {
    const page = UserPage.create(UserMother.list(3), null);
    const userRepository = UserRepositoryMother.create({ search: mock(async () => page) });

    const found = await searchUsers({ userRepository })({ query: " ana ", cursor: "next" });

    expect(found).toBe(page);
    expect(userRepository.search.mock.calls[0]![0].toPrimitive()).toEqual({ query: "ana", cursor: "next" });
  });

  it("doesn't send a query the backend would refuse", async () => {
    const userRepository = UserRepositoryMother.create();

    await expect(searchUsers({ userRepository })({ query: "x".repeat(101), cursor: null })).rejects.toThrow(InvalidUserSearchError);
    expect(userRepository.search).not.toHaveBeenCalled();
  });
});
