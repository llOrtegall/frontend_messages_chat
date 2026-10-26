import { describe, test, expect, afterEach } from "bun:test";
import type { ServerWebSocket } from "bun";
import { WsRealtimeGateway, WsRequestError } from "../../src/infrastructure/realtime/ws-realtime-gateway.ts";
import type { ConnectionStatus } from "../../src/domain/ports.ts";
import type { ServerEvent } from "../../src/domain/entities.ts";

const ROOM = "01a00000-0000-7000-8000-000000000001";
const MSG = "01a00000-0000-7000-8000-000000000002";

let server: ReturnType<typeof Bun.serve<{ ticket: string }>> | null = null;
let gateway: WsRealtimeGateway | null = null;
afterEach(() => { gateway?.disconnect(); server?.stop(true); server = null; gateway = null; });

function fakeBackend() {
  const received: { type: string; refId?: string; payload: { roomIds: string[] } }[] = [];
  const tickets: string[] = [];
  const sockets: ServerWebSocket<{ ticket: string }>[] = [];
  server = Bun.serve<{ ticket: string }>({
    port: 0,
    fetch(req, srv) {
      const ticket = new URL(req.url).searchParams.get("ticket") ?? "";
      tickets.push(ticket);
      return srv.upgrade(req, { data: { ticket } }) ? undefined : new Response("no", { status: 400 });
    },
    websocket: {
      open(ws) { sockets.push(ws); },
      message(ws, raw) {
        const msg = JSON.parse(String(raw));
        received.push(msg);
        const ts = Date.now();
        if (msg.type === "chat.send") ws.send(JSON.stringify({ type: "ack", refId: msg.refId, payload: { id: MSG, createdAt: new Date().toISOString() }, ts }));
        if (msg.type === "chat.delete") ws.send(JSON.stringify({ type: "error", refId: msg.refId, payload: { code: "FORBIDDEN", message: "Not yours" }, ts }));
      },
    },
  });
  return { received, tickets, sockets, url: `http://localhost:${server.port}` };
}

function makeGateway(url: string) {
  let n = 0;
  const g = new WsRealtimeGateway({ url, issueTicket: async () => `ticket-${++n}`, maxBackoffMs: 50 });
  const statuses: ConnectionStatus[] = [];
  const events: ServerEvent[] = [];
  g.onStatus((s) => statuses.push(s));
  g.onEvent((e) => events.push(e));
  gateway = g;
  return { g, statuses, events };
}

async function until(cond: () => boolean, ms = 2000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error("timeout");
    await Bun.sleep(5);
  }
}

describe("WsRealtimeGateway", () => {
  test("connects with a ticket and subscribes rooms in chunks of 50", async () => {
    const be = fakeBackend();
    const { g, statuses } = makeGateway(be.url);
    const rooms = Array.from({ length: 120 }, (_, i) => `01a00000-0000-7000-8000-${String(i).padStart(12, "0")}`);
    g.setRooms(rooms);
    g.connect();
    await until(() => statuses.includes("open"));
    await until(() => be.received.length === 3);
    expect(be.tickets).toEqual(["ticket-1"]);
    expect(be.received.map((m) => m.payload.roomIds.length)).toEqual([50, 50, 20]);

    g.setRooms(rooms.slice(1));
    await until(() => be.received.length === 4);
    expect(be.received[3]).toMatchObject({ type: "chat.unsubscribe", payload: { roomIds: [rooms[0]] } });
  });

  test("resolves acks, rejects error frames and drops frames that break the contract", async () => {
    const be = fakeBackend();
    const { g, statuses, events } = makeGateway(be.url);
    g.connect();
    await until(() => statuses.includes("open"));

    const ack = await g.request("chat.send", { roomId: ROOM, body: "hi" });
    expect(ack.id).toBe(MSG);

    const err = await g.request("chat.delete", { messageId: MSG }).catch((e) => e);
    expect(err).toBeInstanceOf(WsRequestError);
    expect(err.code).toBe("FORBIDDEN");

    const warn = console.warn;
    console.warn = () => {};
    be.sockets[0]!.send(JSON.stringify({ type: "message.deleted", payload: { roomId: "not-a-uuid" }, ts: 1 }));
    be.sockets[0]!.send(JSON.stringify({ type: "user.typing", payload: { roomId: ROOM, userId: MSG }, ts: 2 }));
    await until(() => events.length === 1);
    console.warn = warn;
    expect(events[0]!.type).toBe("user.typing");
  });

  test("reconnects with a new ticket, resubscribes and fails pending requests", async () => {
    const be = fakeBackend();
    const { g, statuses } = makeGateway(be.url);
    g.setRooms([ROOM]);
    g.connect();
    await until(() => statuses.includes("open"));

    be.received.length = 0;
    const pending = g.request("chat.typing", { roomId: ROOM }); // the fake never acks typing
    be.sockets[0]!.close(1001, "going away");
    const err = await pending.catch((e) => e);
    expect(err.code).toBe("DISCONNECTED");

    await until(() => statuses.filter((s) => s === "open").length === 2);
    expect(be.tickets).toEqual(["ticket-1", "ticket-2"]);
    await until(() => be.received.some((m) => m.type === "chat.subscribe"));
    expect(be.received.find((m) => m.type === "chat.subscribe")!.payload.roomIds).toEqual([ROOM]);
  });

  test("requests fail fast while disconnected", async () => {
    const be = fakeBackend();
    const { g } = makeGateway(be.url);
    const err = await g.request("chat.send", { roomId: ROOM, body: "x" }).catch((e) => e);
    expect(err.code).toBe("DISCONNECTED");
  });
});
