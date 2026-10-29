import { UserListResponseSchema } from "../../../contracts/index.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import { UserPage } from "../domain/UserPage.ts";
import type { UserRepository } from "../domain/UserRepository.ts";
import type { UserSearch } from "../domain/UserSearch.ts";

export class HttpUserRepository implements UserRepository {
  constructor(private readonly http: ApiHttp) {}

  async search(search: UserSearch): Promise<UserPage> {
    const { query, cursor } = search.toPrimitive();
    const page = await this.http.request("GET", "/api/v1/users", UserListResponseSchema, {
      query: { q: query, cursor: cursor ?? undefined },
    });
    return UserPage.fromPrimitive(page);
  }
}
