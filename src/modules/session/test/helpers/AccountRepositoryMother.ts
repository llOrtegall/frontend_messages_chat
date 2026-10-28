import { mock } from "bun:test";
import type { Mocked } from "../../../shared/test/helpers/Mocked.ts";
import type { AccountRepository } from "../../domain/AccountRepository.ts";
import * as CurrentUserMother from "./CurrentUserMother.ts";

export const create = (overrides: Partial<AccountRepository> = {}): Mocked<AccountRepository> =>
  ({
    updateProfile: mock(async () => CurrentUserMother.create()),
    confirmEmailVerification: mock(async () => {}),
    requestEmailVerification: mock(async () => {}),
    requestPasswordReset: mock(async () => {}),
    resetPassword: mock(async () => {}),
    ...overrides,
  }) as Mocked<AccountRepository>;
