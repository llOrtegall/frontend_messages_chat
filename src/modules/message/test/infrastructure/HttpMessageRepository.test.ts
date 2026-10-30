import { afterEach, describe, expect, it } from "bun:test";
import { RoomId } from "../../../room/domain/RoomId.ts";
import { ApiHttp } from "../../../shared/infrastructure/ApiHttp.ts";
import { MessageId } from "../../domain/MessageId.ts";
import { HttpMessageRepository } from "../../infrastructure/HttpMessageRepository.ts";
import * as MessageMother from "../helpers/MessageMother.ts";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => {
  server?.stop(true);
  server = null;
});

describe("HttpMessageRepository", () => {
  it("asks for a page before a message and returns it oldest first", async () => {
    const [older, newer] = [MessageMother.createPrimitive(), MessageMother.createPrimitive()];
    const requested: string[] = [];
    server = Bun.serve({
      port: 0,
      fetch(request) {
        const url = new URL(request.url);
        requested.push(`${url.pathname}${url.search}`);
        return Response.json({ messages: [newer, older] });
      },
    });
    const roomId = RoomId.fromPrimitive(crypto.randomUUID());
    const before = MessageId.fromPrimitive(MessageMother.nextId());

    const page = await new HttpMessageRepository(new ApiHttp(`http://localhost:${server.port}`)).listPage(roomId, before, 50);

    expect(page.toPrimitive()).toEqual([older, newer]);
    expect(requested).toEqual([`/api/v1/rooms/${roomId.toPrimitive()}/messages?before=${before.toPrimitive()}&limit=50`]);
  });
});
