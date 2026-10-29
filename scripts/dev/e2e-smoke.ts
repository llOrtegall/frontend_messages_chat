// End-to-end smoke test of the frontend's application + infrastructure layers against a running
// backend (bun run dev in backend_messages_chat, seeded users). Emulates a browser: cookie jar and
// Origin header, so the HttpOnly refresh cookie and the WS ticket flow are exercised for real.
//
//   bun scripts/dev/e2e-smoke.ts [apiUrl] [origin]
import { ChatStore } from "../../src/application/chat-store.ts";
import { legacyRoomPort } from "../../src/composition-root.ts";
import { RestMessageRepository, RestWsTicketIssuer } from "../../src/infrastructure/http/rest-adapters.ts";
import { roomModule } from "../../src/modules/room/application/factory.ts";
import { attachmentModule } from "../../src/modules/attachment/application/factory.ts";
import { sessionModule } from "../../src/modules/session/application/factory.ts";
import { userModule } from "../../src/modules/user/application/factory.ts";
import { UserId } from "../../src/modules/user/domain/UserId.ts";
import type { CurrentUser } from "../../src/modules/session/domain/CurrentUser.ts";
import { WsRealtimeGateway } from "../../src/infrastructure/realtime/ws-realtime-gateway.ts";
import { messageFor } from "../../src/i18n/errorMessages.ts";
import { ApiHttp } from "../../src/modules/shared/infrastructure/ApiHttp.ts";

const API = process.argv[2] ?? "http://localhost:3000";
const ORIGIN = process.argv[3] ?? "http://localhost:3001";

function browserFetch() {
  const jar = new Map<string, string>();
  return async (url: URL, init: RequestInit) => {
    const headers = new Headers(init.headers);
    headers.set("Origin", ORIGIN);
    if (jar.size) headers.set("Cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await fetch(url, { ...init, headers });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [k, v] = pair!.split("=");
      if (/Max-Age=0/i.test(c)) jar.delete(k!);
      else jar.set(k!, v ?? "");
    }
    return res;
  };
}

function client(email: string) {
  const http = new ApiHttp(API, browserFetch());
  // The PUT goes to the bucket: Origin (CORS) but no API cookies.
  const bucketFetch = (url: string, init: RequestInit) =>
    fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Origin: ORIGIN } });
  const session = sessionModule(http, bucketFetch);
  const { uploadAttachment } = attachmentModule(http, bucketFetch);
  const attachments = { upload: async (file: Blob) => (await uploadAttachment(file)).toPrimitive() };
  const tickets = new RestWsTicketIssuer(http);
  const users = userModule(http);
  const chat = (userId: string) =>
    new ChatStore({
      currentUserId: userId,
      rooms: legacyRoomPort(roomModule(http)),
      messages: new RestMessageRepository(http),
      attachments,
      realtime: new WsRealtimeGateway({ url: API, issueTicket: () => tickets.issue() }),
    });
  return { email, http, session, users, chat };
}

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}`);
  if (!ok) failures++;
};
async function until(cond: () => boolean, label: string, ms = 5000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) { check(false, `${label} (timeout)`); return; }
    await Bun.sleep(20);
  }
  check(true, label);
}

const alice = client("alice@dev.local");
const carol = client("carol@dev.local");

let aliceUser: CurrentUser = await alice.session.signIn({ email: alice.email, password: "password123" });
const carolUser = await carol.session.signIn({ email: carol.email, password: "password123" });
check(aliceUser.getEmail().toPrimitive() === alice.email, "login (cookie session)");

// "Page reload": drop the in-memory access token and restore from the HttpOnly cookie only.
alice.http.setAccessToken(null);
const restored = await alice.session.restoreSession();
check(restored?.equals(aliceUser) ?? false, "restore session from refresh cookie");

const aliceId = aliceUser.getId().toPrimitive();
const carolId = carolUser.getId().toPrimitive();
const found = await alice.users.searchUsers({ query: "carol", cursor: null });
check(found.getUsers().includes(UserId.fromPrimitive(carolId)) && !JSON.stringify(found.toPrimitive()).includes("@"), "user search without emails");

const aChat = alice.chat(aliceId);
const cChat = carol.chat(carolId);
aChat.start();
cChat.start();
await until(() => aChat.getSnapshot().connection === "open" && cChat.getSnapshot().connection === "open", "WS connected via ticket");
await until(() => aChat.getSnapshot().roomsLoaded, "rooms loaded on connect");

const roomId = await aChat.openDirect(carolId);
await until(() => cChat.getSnapshot().rooms.some((r) => r.id === roomId), "carol gets room.added for the new DM");

await Bun.sleep(200); // let carol's subscription to the new room reach the server
await aChat.send(roomId, "hola carol (e2e)");
await until(() => (aChat.getSnapshot().messages[roomId] ?? []).some((m) => m.body === "hola carol (e2e)"), "sender sees own message");
await until(() => (cChat.getSnapshot().unread[roomId] ?? 0) === 1, "recipient unread count");

// "Reload" (fresh store, REST only): the unread count comes from the server.
const reloadedUnread = async () => {
  const fresh = carol.chat(carolId);
  await fresh.reloadRooms();
  return fresh.getSnapshot().unread[roomId] ?? 0;
};
check((await reloadedUnread()) === 1, "unread count survives a reload");

await cChat.selectRoom(roomId);
const msg = cChat.getSnapshot().messages[roomId]!.find((m) => m.body === "hola carol (e2e)")!;
check(Boolean(msg) && !cChat.getSnapshot().unread[roomId], "open room loads history and clears unread");
await Bun.sleep(200); // chat.read ack
check((await reloadedUnread()) === 0, "reading is persisted (chat.read)");

cChat.notifyTyping(roomId);
await until(() => (aChat.getSnapshot().typing[roomId] ?? []).includes(carolId), "typing indicator");

await aChat.edit(msg.id, "editado (e2e)");
await until(() => cChat.getSnapshot().messages[roomId]!.some((m) => m.body === "editado (e2e)"), "edit propagates");
await aChat.deleteMessage(msg.id);
await until(() => !cChat.getSnapshot().messages[roomId]!.some((m) => m.id === msg.id), "delete propagates");

// 1x1 transparent PNG
const png = new Blob([Uint8Array.fromBase64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")], { type: "image/png" });
check(await aChat.send(roomId, "foto (e2e)", png), "upload attachment straight to the bucket and send");
await until(() => cChat.getSnapshot().messages[roomId]!.some((m) => m.attachmentMeta?.contentType === "image/png"), "recipient gets attachment metadata");
const att = cChat.getSnapshot().messages[roomId]!.find((m) => m.attachmentMeta)!.attachmentMeta!;
const pub = await fetch(att.url);
check(pub.ok && pub.headers.get("content-type") === "image/png" && att.sizeBytes === png.size, "public URL serves the image");
check(!(await aChat.send(roomId, "", new Blob(["<svg/>"], { type: "image/svg+xml" }))), "SVG is refused");

await aChat.send(roomId, "solo Alice edita esto (e2e)");
await until(() => cChat.getSnapshot().messages[roomId]!.some((m) => m.body === "solo Alice edita esto (e2e)"), "recipient gets a message to try editing");
const alicesMessage = cChat.getSnapshot().messages[roomId]!.find((m) => m.body === "solo Alice edita esto (e2e)")!;
check(!(await cChat.edit(alicesMessage.id, "nope")), "editing someone else's message is refused");
const refusal = cChat.getSnapshot().failure;
check(refusal !== null && messageFor(refusal.cause, refusal.action) === "Solo puedes editar tus propios mensajes.", "refusal surfaces with the backend's code, worded in Spanish");

await until(() => aChat.getSnapshot().rooms.find((r) => r.id === roomId)?.peer?.id === carolId, "DM is titled with the other member");

// Groups: names, roles, leaving.
const groupId = await aChat.createGroup("Equipo e2e", [carolId]);
await until(() => aChat.getSnapshot().selectedRoom?.id === groupId, "group created and opened");
await until(() => cChat.getSnapshot().rooms.some((r) => r.id === groupId), "member gets the new group");
await cChat.selectRoom(groupId);
check(cChat.getSnapshot().selectedRoom?.members.some((m) => m.userId === aliceId && m.role === "owner" && m.displayName.length > 0) ?? false, "members carry names and roles");
await Bun.sleep(200); // subscriptions to the new room
await aChat.setMemberRole(groupId, carolId, "admin");
await until(() => cChat.getSnapshot().selectedRoom?.members.find((m) => m.userId === carolId)?.role === "admin", "role change propagates");
check(!(await aChat.leaveGroup(groupId)), "owner can't leave the group");
await cChat.leaveGroup(groupId);
await until(() => !cChat.getSnapshot().rooms.some((r) => r.id === groupId), "leaving removes the group for the member");
await until(() => !aChat.getSnapshot().selectedRoom?.members.some((m) => m.userId === carolId), "owner sees the member leave");
aChat.dismissFailure();
await aChat.deleteRoom(groupId);

await aChat.deleteRoom(roomId);
await until(() => !cChat.getSnapshot().rooms.some((r) => r.id === roomId) && cChat.getSnapshot().selectedRoomId === null, "room deletion closes it for the other member");

const name = aliceUser.getDisplayName().toPrimitive();
aliceUser = await alice.session.updateProfile(aliceUser, { displayName: `${name} (e2e)`, avatar: png });
const avatarUrl = aliceUser.getAvatarUrl()?.toPrimitive() ?? null;
check(Boolean(avatarUrl) && (await fetch(avatarUrl!)).ok, "profile: uploaded avatar is served");
const seen = (await carol.users.searchUsers({ query: name, cursor: null })).getUsers().toPrimitive().find((user) => user.id === aliceId);
check(seen?.avatarUrl === avatarUrl && seen?.displayName === `${name} (e2e)`, "profile: others see the new name and avatar");
aliceUser = await alice.session.updateProfile(aliceUser, { displayName: name, avatar: null });
check(aliceUser.getAvatarUrl() === null, "profile: avatar removed");

aChat.stop();
cChat.stop();
await alice.session.signOut();
check(!(await alice.http.refresh()), "logout revokes the refresh cookie");
await carol.session.signOut();

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
