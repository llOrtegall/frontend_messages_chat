// End-to-end smoke test of the frontend's application + infrastructure layers against a running
// backend (bun run dev in backend_messages_chat, seeded users). Emulates a browser: cookie jar and
// Origin header, so the HttpOnly refresh cookie and the WS ticket flow are exercised for real.
//
//   bun scripts/dev/e2e-smoke.ts [apiUrl] [origin]
import { ChatSession } from "../../src/hooks/ChatSession.ts";
import { messageFor } from "../../src/i18n/errorMessages.ts";
import { chatModule } from "../../src/modules/chat/application/factory.ts";
import { messageModule } from "../../src/modules/message/application/factory.ts";
import { roomModule } from "../../src/modules/room/application/factory.ts";
import { RoomId } from "../../src/modules/room/domain/RoomId.ts";
import { sessionModule } from "../../src/modules/session/application/factory.ts";
import type { CurrentUser } from "../../src/modules/session/domain/CurrentUser.ts";
import { ApiHttp } from "../../src/modules/shared/infrastructure/ApiHttp.ts";
import { userModule } from "../../src/modules/user/application/factory.ts";
import { UserId } from "../../src/modules/user/domain/UserId.ts";

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
  const users = userModule(http);
  const chat = (userId: string) =>
    new ChatSession(userId, { chat: chatModule(http, API, bucketFetch), rooms: roomModule(http), messages: messageModule(http) });
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

const of = (session: ChatSession) => session.getSnapshot().chat;
const messagesIn = (session: ChatSession, roomId: string) => of(session).historyOf(RoomId.fromPrimitive(roomId))?.getMessages().toPrimitive() ?? [];
const roomsOf = (session: ChatSession) => of(session).getRooms()?.toPrimitive() ?? [];
const unreadIn = (session: ChatSession, roomId: string) => of(session).getRooms()?.find(RoomId.fromPrimitive(roomId))?.getUnreadCount() ?? 0;
const openRoomOf = (session: ChatSession) => of(session).getOpenRoom()?.toPrimitive() ?? null;

const aChat = alice.chat(aliceId);
const cChat = carol.chat(carolId);
aChat.start();
cChat.start();
await until(() => of(aChat).isConnected() && of(cChat).isConnected(), "WS connected via ticket");
await until(() => of(aChat).getRooms() !== null, "rooms loaded on connect");

const roomId = await aChat.openDirect(carolId);
await until(() => roomsOf(cChat).some((room) => room.id === roomId), "carol gets room.added for the new DM");
await until(() => of(aChat).getOpenRoomId()?.toPrimitive() === roomId, "the new DM is open for its opener");

await Bun.sleep(200); // let carol's subscription to the new room reach the server
await aChat.send(roomId, "hola carol (e2e)");
await until(() => messagesIn(aChat, roomId).some((message) => message.body === "hola carol (e2e)"), "sender sees own message");
await until(() => unreadIn(cChat, roomId) === 1, "recipient unread count");

// "Reload" (fresh store, REST only): the unread count comes from the server.
const reloadedUnread = async () => {
  const fresh = carol.chat(carolId);
  await fresh.reloadRooms();
  return unreadIn(fresh, roomId);
};
check((await reloadedUnread()) === 1, "unread count survives a reload");

await cChat.selectRoom(roomId);
const msg = messagesIn(cChat, roomId).find((message) => message.body === "hola carol (e2e)")!;
check(Boolean(msg) && unreadIn(cChat, roomId) === 0, "open room loads history and clears unread");
await Bun.sleep(200); // chat.read ack
check((await reloadedUnread()) === 0, "reading is persisted (chat.read)");

cChat.notifyTyping(roomId);
await until(() => of(aChat).typistsIn(RoomId.fromPrimitive(roomId)).some((typist) => typist.toPrimitive() === carolId), "typing indicator");

await aChat.edit(msg.id, "editado (e2e)");
await until(() => messagesIn(cChat, roomId).some((message) => message.body === "editado (e2e)"), "edit propagates");
await aChat.deleteMessage(msg.id);
await until(() => !messagesIn(cChat, roomId).some((message) => message.id === msg.id), "delete propagates");

// 1x1 transparent PNG
const png = new Blob([Uint8Array.fromBase64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")], { type: "image/png" });
check(await aChat.send(roomId, "foto (e2e)", png), "upload attachment straight to the bucket and send");
await until(() => messagesIn(cChat, roomId).some((message) => message.attachmentMeta?.contentType === "image/png"), "recipient gets attachment metadata");
const att = messagesIn(cChat, roomId).find((message) => message.attachmentMeta)!.attachmentMeta!;
const pub = await fetch(att.url);
check(pub.ok && pub.headers.get("content-type") === "image/png" && att.sizeBytes === png.size, "public URL serves the image");
check(!(await aChat.send(roomId, "", new Blob(["<svg/>"], { type: "image/svg+xml" }))), "SVG is refused");

await aChat.send(roomId, "solo Alice edita esto (e2e)");
await until(() => messagesIn(cChat, roomId).some((message) => message.body === "solo Alice edita esto (e2e)"), "recipient gets a message to try editing");
const alicesMessage = messagesIn(cChat, roomId).find((message) => message.body === "solo Alice edita esto (e2e)")!;
check(!(await cChat.edit(alicesMessage.id, "nope")), "editing someone else's message is refused");
const refusal = cChat.getSnapshot().failure;
check(refusal !== null && messageFor(refusal.cause, refusal.action) === "Solo puedes editar tus propios mensajes.", "refusal surfaces with the backend's code, worded in Spanish");

await until(() => roomsOf(aChat).find((room) => room.id === roomId)?.peer?.id === carolId, "DM is titled with the other member");

// Groups: names, roles, leaving.
const groupId = await aChat.createGroup("Equipo e2e", [carolId]);
await until(() => openRoomOf(aChat)?.id === groupId, "group created and opened");
await until(() => roomsOf(cChat).some((room) => room.id === groupId), "member gets the new group");
await cChat.selectRoom(groupId);
check(openRoomOf(cChat)?.members.some((member) => member.userId === aliceId && member.role === "owner" && member.displayName.length > 0) ?? false, "members carry names and roles");
await Bun.sleep(200); // subscriptions to the new room
await aChat.changeMemberRole(groupId, carolId, "admin");
await until(() => openRoomOf(cChat)?.members.find((member) => member.userId === carolId)?.role === "admin", "role change propagates");
check(!(await aChat.leaveGroup(groupId)), "owner can't leave the group");
await cChat.leaveGroup(groupId);
await until(() => !roomsOf(cChat).some((room) => room.id === groupId), "leaving removes the group for the member");
await until(() => !openRoomOf(aChat)?.members.some((member) => member.userId === carolId), "owner sees the member leave");
aChat.dismissFailure();
await aChat.deleteRoom(groupId);

await aChat.deleteRoom(roomId);
await until(() => !roomsOf(cChat).some((room) => room.id === roomId) && of(cChat).getOpenRoomId() === null, "room deletion closes it for the other member");

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
