import { ChatStore } from "./application/chat-store.ts";
import { SessionStore } from "./application/session-store.ts";
import { HttpClient } from "./infrastructure/http/http-client.ts";
import {
  RestAuthGateway,
  RestMessageRepository,
  RestRoomRepository,
  RestUserDirectory,
} from "./infrastructure/http/rest-adapters.ts";
import { WsRealtimeGateway } from "./infrastructure/realtime/ws-realtime-gateway.ts";

/** The only place that knows the concrete adapters; the UI receives stores and ports. */
export function createContainer(apiUrl: string) {
  const http = new HttpClient(apiUrl);
  const auth = new RestAuthGateway(http);
  const rooms = new RestRoomRepository(http);
  const messages = new RestMessageRepository(http);

  return {
    session: new SessionStore(auth),
    users: new RestUserDirectory(http),
    createChat: (currentUserId: string) =>
      new ChatStore({
        currentUserId,
        rooms,
        messages,
        realtime: new WsRealtimeGateway({ url: apiUrl, issueTicket: () => auth.issueWsTicket() }),
      }),
  };
}

export type Container = ReturnType<typeof createContainer>;
