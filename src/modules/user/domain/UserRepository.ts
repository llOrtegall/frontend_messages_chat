import type { UserPage } from "./UserPage.ts";
import type { UserSearch } from "./UserSearch.ts";

export interface UserRepository {
  search(search: UserSearch): Promise<UserPage>;
}
