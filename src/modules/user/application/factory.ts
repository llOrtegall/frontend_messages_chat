import { apiHttp } from "../../shared/application/factory.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import { HttpUserRepository } from "../infrastructure/HttpUserRepository.ts";
import { searchUsers } from "./searchUsers.ts";

export const userModule = (http: ApiHttp) => {
  const userRepository = new HttpUserRepository(http);

  return {
    searchUsers: searchUsers({ userRepository }),
  };
};

export type UserModule = ReturnType<typeof userModule>;

export const users = userModule(apiHttp);
