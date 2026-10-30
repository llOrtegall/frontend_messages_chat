import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { listMessages } from "../../application/listMessages.ts";
import { InvalidMessageIdError } from "../../domain/errors/InvalidMessageIdError.ts";
import { MessageList } from "../../domain/MessageList.ts";
import type { MessageRepository } from "../../domain/MessageRepository.ts";
import type { Mocked } from "../../../shared/test/helpers/Mocked.ts";
import * as MessageMother from "../helpers/MessageMother.ts";

const repository = (page = MessageList.empty()): Mocked<MessageRepository> =>
  ({ listPage: mock(async () => page) }) as Mocked<MessageRepository>;

describe("listMessages", () => {
  it("asks for the page before a message, or the newest one", async () => {
    const before = MessageMother.nextId();
    const page = MessageList.create([MessageMother.create()]);
    const messageRepository = repository(page);
    const list = listMessages({ messageRepository });

    expect(await list({ roomId: faker.string.uuid(), before, limit: 50 })).toBe(page);
    await list({ roomId: faker.string.uuid(), before: null, limit: 20 });

    expect(messageRepository.listPage.mock.calls.map(([, cursor, limit]) => [cursor?.toPrimitive() ?? null, limit])).toEqual([
      [before, 50],
      [null, 20],
    ]);
  });

  it("refuses a malformed cursor", async () => {
    const messageRepository = repository();

    await expect(listMessages({ messageRepository })({ roomId: faker.string.uuid(), before: "m1", limit: 50 })).rejects.toThrow(InvalidMessageIdError);
    expect(messageRepository.listPage).not.toHaveBeenCalled();
  });
});
