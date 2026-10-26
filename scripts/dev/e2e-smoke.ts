// End-to-end smoke test of the frontend's application + infrastructure layers against a running
// backend (bun run dev in backend_messages_chat, seeded users). Emulates a browser: cookie jar and
// Origin header, so the HttpOnly refresh cookie and the WS ticket flow are exercised for real.
//
//   bun scripts/dev/e2e-smoke.ts [apiUrl] [origin]
import { ChatStore } from "../../src/application/chat-store.ts";
import { SessionStore } from "../../src/application/session-store.ts";
import { HttpClient } from "../../src/infrastructure/http/http-client.ts";
import { RestAuthGateway, RestMessageRepository, RestRoomRepository, RestUserDirectory } from "../../src/infrastructure/http/rest-adapters.ts";
import { WsRealtimeGateway } from "../../src/infrastructure/realtime/ws-realtime-gateway.ts";

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
  const http = new HttpClient(API, browserFetch());
  const auth = new RestAuthGateway(http);
  const session = new SessionStore(auth);
  const users = new RestUserDirectory(http);
  const chat = (userId: string) =>
    new ChatStore({
      currentUserId: userId,
      rooms: new RestRoomRepository(http),
      messages: new RestMessageRepository(http),
      realtime: new WsRealtimeGateway({ url: API, issueTicket: () => auth.issueWsTicket() }),
    });
  return { email, http, auth, session, users, chat };
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

await alice.session.login(alice.email, "password123");
await carol.session.login(carol.email, "password123");
check(alice.session.getSnapshot().status === "authenticated", "login (cookie session)");

// "Page reload": drop the in-memory access token and restore from the HttpOnly cookie only.
alice.http.setAccessToken(null);
const reloaded = new SessionStore(alice.auth);
await reloaded.restore();
check(reloaded.getSnapshot().user?.email === alice.email, "restore session from refresh cookie");

const aliceId = alice.session.getSnapshot().user!.id;
const carolId = carol.session.getSnapshot().user!.id;
const found = await alice.users.search({ query: "carol" });
check(found.users.some((u) => u.id === carolId) && !JSON.stringify(found).includes("@"), "user search without emails");

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

await cChat.selectRoom(roomId);
const msg = cChat.getSnapshot().messages[roomId]!.find((m) => m.body === "hola carol (e2e)")!;
check(Boolean(msg) && !cChat.getSnapshot().unread[roomId], "open room loads history and clears unread");

cChat.notifyTyping(roomId);
await until(() => (aChat.getSnapshot().typing[roomId] ?? []).includes(carolId), "typing indicator");

await aChat.edit(msg.id, "editado (e2e)");
await until(() => cChat.getSnapshot().messages[roomId]!.some((m) => m.body === "editado (e2e)"), "edit propagates");
await aChat.deleteMessage(msg.id);
await until(() => !cChat.getSnapshot().messages[roomId]!.some((m) => m.id === msg.id), "delete propagates");

check(!(await cChat.edit(msg.id, "nope")), "editing someone else's message is refused");
check(cChat.getSnapshot().error !== null, "refusal surfaces as an error message");

await aChat.deleteRoom(roomId);
await until(() => !cChat.getSnapshot().rooms.some((r) => r.id === roomId) && cChat.getSnapshot().selectedRoomId === null, "room deletion closes it for the other member");

aChat.stop();
cChat.stop();
await alice.session.logout();
check(!(await alice.http.refresh()), "logout revokes the refresh cookie");
await carol.session.logout();

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
