import { mock } from "bun:test";
import type { Mocked } from "../../../shared/test/helpers/Mocked.ts";
import { UserList } from "../../domain/UserList.ts";
import { UserPage } from "../../domain/UserPage.ts";
import type { UserRepository } from "../../domain/UserRepository.ts";

export const create = (overrides: Partial<UserRepository> = {}): Mocked<UserRepository> =>
  ({
    search: mock(async () => UserPage.create(UserList.empty(), null)),
    ...overrides,
  }) as Mocked<UserRepository>;
