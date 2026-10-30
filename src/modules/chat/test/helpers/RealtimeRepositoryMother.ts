import { mock } from "bun:test";
import { MessageId } from "../../../message/domain/MessageId.ts";
import * as MessageMother from "../../../message/test/helpers/MessageMother.ts";
import type { RealtimeRepository } from "../../../realtime/domain/RealtimeRepository.ts";
import type { Mocked } from "../../../shared/test/helpers/Mocked.ts";

export const create = (overrides: Partial<RealtimeRepository> = {}): Mocked<RealtimeRepository> =>
  ({
    connect: mock(() => {}),
    disconnect: mock(() => {}),
    watchRooms: mock(() => {}),
    send: mock(async () => MessageId.fromPrimitive(MessageMother.nextId())),
    edit: mock(async () => {}),
    delete: mock(async () => {}),
    markRead: mock(async () => {}),
    notifyTyping: mock(() => {}),
    onEvent: mock(() => () => {}),
    onStatus: mock(() => () => {}),
    ...overrides,
  }) as Mocked<RealtimeRepository>;
