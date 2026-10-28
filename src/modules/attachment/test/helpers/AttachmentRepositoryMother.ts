import { mock } from "bun:test";
import type { Mocked } from "../../../shared/test/helpers/Mocked.ts";
import type { AttachmentRepository } from "../../domain/AttachmentRepository.ts";
import * as AttachmentMother from "./AttachmentMother.ts";

export const create = (overrides: Partial<AttachmentRepository> = {}): Mocked<AttachmentRepository> =>
  ({
    upload: mock(async () => AttachmentMother.key()),
    ...overrides,
  }) as Mocked<AttachmentRepository>;
