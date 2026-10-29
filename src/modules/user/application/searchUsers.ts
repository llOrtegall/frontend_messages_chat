import type { UserPage } from "../domain/UserPage.ts";
import type { UserRepository } from "../domain/UserRepository.ts";
import { UserSearch, type UserSearchPrimitive } from "../domain/UserSearch.ts";

export const searchUsers = ({ userRepository }: { readonly userRepository: UserRepository }) =>
  async (search: UserSearchPrimitive): Promise<UserPage> => userRepository.search(UserSearch.fromPrimitive(search));
