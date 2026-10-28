import { mock } from "bun:test";
import type { Mocked } from "../../../shared/test/helpers/Mocked.ts";
import type { SessionRepository } from "../../domain/SessionRepository.ts";
import * as CurrentUserMother from "./CurrentUserMother.ts";

export const create = (overrides: Partial<SessionRepository> = {}): Mocked<SessionRepository> =>
  ({
    signIn: mock(async () => CurrentUserMother.create()),
    signUp: mock(async () => CurrentUserMother.unverified()),
    restore: mock(async () => null),
    signOut: mock(async () => {}),
    onExpired: mock(() => () => {}),
    ...overrides,
  }) as Mocked<SessionRepository>;
