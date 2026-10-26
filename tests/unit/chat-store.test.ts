import { describe, test, expect } from "bun:test";
import { ChatStore } from "../../src/application/chat-store.ts";
import { FakeAttachments, FakeMessages, FakeRealtime, FakeRooms, flush, iso, message, room } from "../fakes.ts";

const ME = "me";

function setup(rooms = [room({ createdAt: iso(1) }), room({ createdAt: iso(2) })]) {
  const realtime = new FakeRealtime();
  const roomsRepo = new FakeRooms(rooms);
  const messages = new FakeMessages();
  const attachments = new FakeAttachments();
  const store = new ChatStore(
    { currentUserId: ME, rooms: roomsRepo, messages, attachments, realtime },
    { pageSize: 2, typingTtlMs: 30, typingThrottleMs: 50 },
  );
  store.start();
  return { store, realtime, roomsRepo, messages, attachments, rooms };
}

describe("ChatStore", () => {
  test("loads rooms on every (re)connect and subscribes to them", async () => {
    const { store, realtime, roomsRepo, rooms } = setup();
    expect(realtime.connected).toBe(true);
    realtime.status("open");
    await flush();
    expect(store.getSnapshot().rooms.map((r) => r.id)).toEqual([rooms[1]!.id, rooms[0]!.id]); // most recent first
    expect(realtime.rooms).toEqual([rooms[1]!.id, rooms[0]!.id]);

    roomsRepo.rooms.push(room({ createdAt: iso(3) }));
    realtime.status("closed");
    realtime.status("open");
    await flush();
    expect(store.getSnapshot().rooms).toHaveLength(3);
    expect(store.getSnapshot().connection).toBe("open");
  });

  test("selecting a room loads its first page; loadOlder pages back until exhausted", async () => {
    const { store, messages, rooms } = setup();
    const r = rooms[0]!.id;
    const msgs = [message(r), message(r), message(r)];
    messages.pages.set(r, msgs);

    await store.selectRoom(r);
    expect(store.getSnapshot().messages[r]!.map((m) => m.id)).toEqual([msgs[1]!.id, msgs[2]!.id]);
    expect(store.getSnapshot().history[r]).toEqual({ loading: false, hasMore: true });

    await store.loadOlder(r);
    expect(store.getSnapshot().messages[r]!.map((m) => m.id)).toEqual(msgs.map((m) => m.id));
    expect(store.getSnapshot().history[r]!.hasMore).toBe(false);

    await store.loadOlder(r);
    expect(messages.calls).toHaveLength(2); // no request once exhausted
  });

  test("message events update loaded rooms, reorder the list and count unread once", async () => {
    const { store, realtime, rooms } = setup();
    realtime.status("open");
    await flush();
    const [older, newer] = [rooms[0]!.id, rooms[1]!.id];
    await store.selectRoom(newer);

    const m = message(older, { createdAt: iso(10) });
    realtime.emit({ type: "message.created", payload: m });
    realtime.emit({ type: "message.created", payload: m }); // duplicate delivery
    expect(store.getSnapshot().unread[older]).toBe(1);
    expect(store.getSnapshot().rooms[0]!.id).toBe(older); // moved to top
    expect(store.getSnapshot().messages[older]).toBeUndefined(); // not loaded → fetched on open

    const own = message(newer, { senderId: ME });
    realtime.emit({ type: "message.created", payload: own });
    expect(store.getSnapshot().messages[newer]!.map((x) => x.id)).toEqual([own.id]);
    expect(store.getSnapshot().unread[newer]).toBeUndefined();

    realtime.emit({ type: "message.edited", payload: { ...own, body: "edited", editedAt: iso(11) } });
    expect(store.getSnapshot().messages[newer]![0]!.body).toBe("edited");
    realtime.emit({ type: "message.deleted", payload: { roomId: newer, messageId: own.id } });
    expect(store.getSnapshot().messages[newer]).toEqual([]);

    await store.selectRoom(older);
    expect(store.getSnapshot().unread[older]).toBeUndefined();
  });

  test("unread comes from the server; reading the open room is persisted with chat.read", async () => {
    const { store, realtime, roomsRepo, messages, rooms } = setup();
    const [a, b] = [rooms[0]!.id, rooms[1]!.id];
    roomsRepo.unreadCounts.set(a, 3);
    const msgs = [message(a), message(a)];
    messages.pages.set(a, msgs);
    realtime.status("open");
    await flush();
    expect(store.getSnapshot().unread).toEqual({ [a]: 3 });

    await store.selectRoom(a);
    expect(store.getSnapshot().unread[a]).toBeUndefined();
    const reads = () => realtime.requests.filter((r) => r.type === "chat.read").map((r) => r.payload);
    expect(reads()).toEqual([{ roomId: a, messageId: msgs[1]!.id }]);

    // A new message from someone else in the open room is acknowledged; my own is not.
    const incoming = message(a);
    realtime.emit({ type: "message.created", payload: incoming });
    const mine = message(a, { senderId: ME });
    realtime.emit({ type: "message.created", payload: mine });
    expect(reads()).toEqual([{ roomId: a, messageId: msgs[1]!.id }, { roomId: a, messageId: incoming.id }]);

    // Reconnect: the open room isn't re-badged; the pointer catches up once, never twice.
    roomsRepo.unreadCounts.set(b, 1);
    for (let i = 0; i < 2; i++) {
      realtime.status("closed");
      realtime.status("open");
      await flush();
    }
    expect(store.getSnapshot().unread).toEqual({ [b]: 1 });
    expect(reads().slice(2)).toEqual([{ roomId: a, messageId: mine.id }]);

    // Read on another device of mine clears the badge here.
    realtime.emit({ type: "message.read", payload: { roomId: b, userId: ME, messageId: incoming.id } });
    expect(store.getSnapshot().unread[b]).toBeUndefined();
  });

  test("member events keep the open group's member list current", async () => {
    const { store, realtime, roomsRepo } = setup();
    const g = room({ kind: "group", name: "G" });
    const m = (userId: string, role: "owner" | "admin" | "member" = "member") =>
      ({ userId, displayName: userId, avatarUrl: null, role, joinedAt: iso(), lastReadMessageId: null, mutedUntil: null });
    roomsRepo.rooms.push(g);
    roomsRepo.details.set(g.id, { ...g, members: [m(ME, "owner"), m("b")] });
    await store.selectRoom(g.id);

    realtime.emit({ type: "room.member_added", payload: { roomId: g.id, member: m("c") } });
    realtime.emit({ type: "room.member_updated", payload: { roomId: g.id, member: m("b", "admin") } });
    realtime.emit({ type: "room.member_removed", payload: { roomId: g.id, userId: "c" } });
    expect(store.getSnapshot().selectedRoom!.members.map((x) => [x.userId, x.role])).toEqual([[ME, "owner"], ["b", "admin"]]);

    expect(await store.setMemberRole(g.id, "b", "member")).toBe(true);
    expect(await store.leaveGroup(g.id)).toBe(true);
    expect(roomsRepo.calls).toEqual([
      { op: "role", args: [g.id, "b", "member"] },
      { op: "remove", args: [g.id, ME] },
    ]);
  });

  test("room.added / room.removed keep the list and subscriptions current", async () => {
    const { store, realtime, rooms } = setup();
    realtime.status("open");
    await flush();
    await store.selectRoom(rooms[0]!.id);

    const added = room({ createdAt: iso(20) });
    realtime.emit({ type: "room.added", payload: { room: added } });
    expect(store.getSnapshot().rooms[0]!.id).toBe(added.id);
    expect(realtime.rooms).toContain(added.id);

    realtime.emit({ type: "room.removed", payload: { roomId: rooms[0]!.id } });
    const s = store.getSnapshot();
    expect(s.rooms.map((r) => r.id)).not.toContain(rooms[0]!.id);
    expect(realtime.rooms).not.toContain(rooms[0]!.id);
    expect(s.selectedRoomId).toBeNull();
    expect(s.messages[rooms[0]!.id]).toBeUndefined();
  });

  test("typing indicators expire and ignore my own events; notifications are throttled", async () => {
    const { store, realtime, rooms } = setup();
    const r = rooms[0]!.id;
    realtime.emit({ type: "user.typing", payload: { roomId: r, userId: "u1" } });
    realtime.emit({ type: "user.typing", payload: { roomId: r, userId: ME } });
    expect(store.getSnapshot().typing[r]).toEqual(["u1"]);
    await Bun.sleep(50);
    expect(store.getSnapshot().typing[r]).toEqual([]);

    store.notifyTyping(r);
    store.notifyTyping(r);
    expect(realtime.notifications).toHaveLength(1);
    await Bun.sleep(60);
    store.notifyTyping(r);
    expect(realtime.notifications).toHaveLength(2);
    await store.send(r, "x"); // sending resets the throttle
    store.notifyTyping(r);
    expect(realtime.notifications).toHaveLength(3);
  });

  test("send trims, skips empty bodies and reports failures in state", async () => {
    const { store, realtime, rooms } = setup();
    const r = rooms[0]!.id;
    expect(await store.send(r, "   ")).toBe(false);
    expect(realtime.requests).toHaveLength(0);

    expect(await store.send(r, "  hola  ")).toBe(true);
    expect(realtime.requests[0]).toMatchObject({ type: "chat.send", payload: { roomId: r, body: "hola" } });

    realtime.failNextRequest = new Error("Not a member of this room");
    expect(await store.send(r, "x")).toBe(false);
    expect(store.getSnapshot().error).toBe("Not a member of this room");
    store.dismissError();
    expect(store.getSnapshot().error).toBeNull();
  });

  test("send with a file uploads it first and attaches the key", async () => {
    const { store, realtime, attachments, rooms } = setup();
    const r = rooms[0]!.id;
    const file = new Blob(["x"], { type: "image/png" });

    expect(await store.send(r, "", file)).toBe(true);
    expect(attachments.uploads).toEqual([file]);
    expect(realtime.requests[0]).toMatchObject({ type: "chat.send", payload: { roomId: r, body: "", attachmentKey: "uploads/me/1.png" } });

    attachments.failNext = new Error("Tipo de archivo no permitido");
    expect(await store.send(r, "caption", file)).toBe(false);
    expect(realtime.requests).toHaveLength(1);
    expect(store.getSnapshot().error).toBe("Tipo de archivo no permitido");
  });

  test("presence events are tracked", () => {
    const { store, realtime } = setup();
    realtime.emit({ type: "presence.online", payload: { userId: "u1" } });
    realtime.emit({ type: "presence.offline", payload: { userId: "u2" } });
    expect(store.getSnapshot().presence).toEqual({ u1: true, u2: false });
  });

  test("stop unsubscribes from events and disconnects", () => {
    const { store, realtime, rooms } = setup();
    store.stop();
    expect(realtime.connected).toBe(false);
    realtime.emit({ type: "room.removed", payload: { roomId: rooms[0]!.id } });
    expect(store.getSnapshot().rooms).toEqual([]); // unchanged (never loaded), no crash
  });
});
