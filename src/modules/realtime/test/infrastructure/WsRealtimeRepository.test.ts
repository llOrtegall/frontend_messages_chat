import { afterEach, describe, expect, it } from "bun:test";
import type { ServerWebSocket } from "bun";
import { MessageBody } from "../../../message/domain/MessageBody.ts";
import { MessageDraft } from "../../../message/domain/MessageDraft.ts";
import { MessageId } from "../../../message/domain/MessageId.ts";
import { RoomId } from "../../../room/domain/RoomId.ts";
import { RequestFailedError } from "../../../shared/domain/errors/RequestFailedError.ts";
import { ApiHttp } from "../../../shared/infrastructure/ApiHttp.ts";
import type { ChatEvent } from "../../domain/ChatEvent.ts";
import type { ConnectionStatus } from "../../domain/ConnectionStatus.ts";
import { WsRealtimeRepository } from "../../infrastructure/WsRealtimeRepository.ts";

const ROOM = "01a00000-0000-7000-8000-000000000001";
const MESSAGE = "01a00000-0000-7000-8000-000000000002";

let server: ReturnType<typeof Bun.serve<{ ticket: string }>> | null = null;
let realtime: WsRealtimeRepository | null = null;
afterEach(() => {
  realtime?.disconnect();
  server?.stop(true);
  server = null;
  realtime = null;
});

interface Received {
  readonly type: string;
  readonly refId?: string;
  readonly payload: { readonly roomIds: string[] } & Record<string, unknown>;
}

/** Fake backend: issues numbered tickets, accepts the socket, acks chat.send and refuses chat.delete. */
const fakeBackend = () => {
  const received: Received[] = [];
  const tickets: string[] = [];
  const sockets: ServerWebSocket<{ ticket: string }>[] = [];
  let issued = 0;
  server = Bun.serve<{ ticket: string }>({
    port: 0,
    fetch(request, bun) {
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/ws/ticket") return Response.json({ ticket: `ticket-${++issued}` });
      const ticket = url.searchParams.get("ticket") ?? "";
      tickets.push(ticket);
      return bun.upgrade(request, { data: { ticket } }) ? undefined : new Response("no", { status: 400 });
    },
    websocket: {
      open(socket) {
        sockets.push(socket);
      },
      message(socket, raw) {
        const message = JSON.parse(String(raw)) as Received;
        received.push(message);
        const ts = Date.now();
        if (message.type === "chat.send") {
          socket.send(JSON.stringify({ type: "ack", refId: message.refId, payload: { id: MESSAGE, createdAt: new Date().toISOString() }, ts }));
        }
        if (message.type === "chat.delete") {
          socket.send(JSON.stringify({ type: "error", refId: message.refId, payload: { code: "message.not_sender", message: "Not yours" }, ts }));
        }
      },
    },
  });
  return { received, tickets, sockets, url: `http://localhost:${server.port}` };
};

const connectTo = (url: string) => {
  const repository = new WsRealtimeRepository(new ApiHttp(url), url, { maxBackoffMs: 50 });
  const statuses: ConnectionStatus[] = [];
  const events: ChatEvent[] = [];
  repository.onStatus((status) => statuses.push(status));
  repository.onEvent((event) => events.push(event));
  realtime = repository;
  return { repository, statuses, events };
};

const until = async (condition: () => boolean, ms = 2000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > ms) throw new Error("timeout");
    await Bun.sleep(5);
  }
};

const silencingWarnings = async (action: () => Promise<void>) => {
  const original = console.warn;
  console.warn = () => {};
  try {
    await action();
  } finally {
    console.warn = original;
  }
};

describe("WsRealtimeRepository", () => {
  it("connects with a ticket and watches rooms in chunks of 50", async () => {
    const backend = fakeBackend();
    const { repository, statuses } = connectTo(backend.url);
    const rooms = Array.from({ length: 120 }, (_, index) => RoomId.fromPrimitive(`01a00000-0000-7000-8000-${String(index).padStart(12, "0")}`));

    repository.watchRooms(rooms);
    repository.connect();
    await until(() => statuses.includes("open"));
    await until(() => backend.received.length === 3);

    expect(backend.tickets).toEqual(["ticket-1"]);
    expect(backend.received.map((message) => message.payload.roomIds.length)).toEqual([50, 50, 20]);

    repository.watchRooms(rooms.slice(1));
    await until(() => backend.received.length === 4);
    expect(backend.received[3]).toMatchObject({ type: "chat.unsubscribe", payload: { roomIds: [rooms[0]!.toPrimitive()] } });
  });

  it("sends a draft and returns the stored id; a refusal fails with the backend's code", async () => {
    const backend = fakeBackend();
    const { repository, statuses } = connectTo(backend.url);
    repository.connect();
    await until(() => statuses.includes("open"));
    const draft = MessageDraft.write(RoomId.fromPrimitive(ROOM), "  hola ", null);

    const id = await repository.send(draft);
    const refusal = await repository.delete(MessageId.fromPrimitive(MESSAGE)).catch((error: unknown) => error);

    expect(id.toPrimitive()).toBe(MESSAGE);
    const sent: unknown = backend.received.find((message) => message.type === "chat.send")?.payload;
    expect(sent).toEqual({
      roomId: ROOM,
      body: "hola",
      clientMessageId: draft.toPrimitive().clientMessageId,
    });
    expect(refusal).toBeInstanceOf(RequestFailedError);
    expect((refusal as RequestFailedError).code).toBe("message.not_sender");
  });

  it("turns frames into domain events and drops the ones that break the contract", async () => {
    const backend = fakeBackend();
    const { repository, statuses, events } = connectTo(backend.url);
    repository.connect();
    await until(() => statuses.includes("open"));

    await silencingWarnings(async () => {
      backend.sockets[0]!.send(JSON.stringify({ type: "message.deleted", payload: { roomId: "not-a-uuid" }, ts: 1 }));
      backend.sockets[0]!.send(JSON.stringify({ type: "presence.offline", payload: { userId: MESSAGE }, ts: 2, addedLater: true }));
      await until(() => events.length === 1);
    });

    expect(events[0]).toMatchObject({ type: "presence.changed", isOnline: false });
    expect(events[0]!.type === "presence.changed" && events[0]!.userId.toPrimitive()).toBe(MESSAGE);
  });

  it("reconnects with a new ticket, watches the same rooms again and fails what was pending", async () => {
    const backend = fakeBackend();
    const { repository, statuses } = connectTo(backend.url);
    repository.watchRooms([RoomId.fromPrimitive(ROOM)]);
    repository.connect();
    await until(() => statuses.includes("open"));
    backend.received.length = 0;

    const pending = repository.markRead(RoomId.fromPrimitive(ROOM), MessageId.fromPrimitive(MESSAGE));
    backend.sockets[0]!.close(1001, "going away");
    const failure = await pending.catch((error: unknown) => error);

    expect((failure as RequestFailedError).code).toBe(RequestFailedError.DISCONNECTED);
    await until(() => statuses.filter((status) => status === "open").length === 2);
    expect(backend.tickets).toEqual(["ticket-1", "ticket-2"]);
    await until(() => backend.received.some((message) => message.type === "chat.subscribe"));
    expect(backend.received.find((message) => message.type === "chat.subscribe")!.payload.roomIds).toEqual([ROOM]);
  });

  it("fails requests at once while disconnected", async () => {
    const backend = fakeBackend();
    const { repository } = connectTo(backend.url);

    const failure = await repository.edit(MessageId.fromPrimitive(MESSAGE), MessageBody.create("x")).catch((error: unknown) => error);

    expect((failure as RequestFailedError).code).toBe(RequestFailedError.DISCONNECTED);
  });
});
