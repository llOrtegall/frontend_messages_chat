import { afterEach, describe, expect, it } from "bun:test";
import { ApiHttp } from "../../../shared/infrastructure/ApiHttp.ts";
import { UserSearch } from "../../domain/UserSearch.ts";
import { HttpUserRepository } from "../../infrastructure/HttpUserRepository.ts";
import * as UserMother from "../helpers/UserMother.ts";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => {
  server?.stop(true);
  server = null;
});

describe("HttpUserRepository", () => {
  it("sends the query and cursor only when present, and maps the page", async () => {
    const queries: string[] = [];
    const users = [UserMother.createPrimitive(), UserMother.createPrimitive()];
    server = Bun.serve({
      port: 0,
      fetch(request) {
        queries.push(new URL(request.url).search);
        return Response.json({ users, nextCursor: "next" });
      },
    });
    const repository = new HttpUserRepository(new ApiHttp(`http://localhost:${server.port}`));

    const page = await repository.search(UserSearch.fromPrimitive({ query: "ana", cursor: "abc" }));
    await repository.search(UserSearch.fromPrimitive({ query: "", cursor: null }));

    expect(page.toPrimitive()).toEqual({ users, nextCursor: "next" });
    expect(queries).toEqual(["?q=ana&cursor=abc", ""]);
  });
});
