import { ChatStore } from "./application/chat-store.ts";
import { SessionStore } from "./application/session-store.ts";
import {
  RestAuthGateway,
  RestMessageRepository,
  RestRoomRepository,
  RestUserDirectory,
} from "./infrastructure/http/rest-adapters.ts";
import { S3AttachmentUploader } from "./infrastructure/http/attachment-uploader.ts";
import { WsRealtimeGateway } from "./infrastructure/realtime/ws-realtime-gateway.ts";
import { ApiHttp } from "./modules/shared/infrastructure/ApiHttp.ts";

/** The only place that knows the concrete adapters; the UI receives stores and ports. */
export function createContainer(apiUrl: string) {
  const http = new ApiHttp(apiUrl);
  const auth = new RestAuthGateway(http);
  const rooms = new RestRoomRepository(http);
  const messages = new RestMessageRepository(http);
  const attachments = new S3AttachmentUploader(http);

  return {
    session: new SessionStore(auth, attachments),
    users: new RestUserDirectory(http),
    createChat: (currentUserId: string) =>
      new ChatStore({
        currentUserId,
        rooms,
        messages,
        attachments,
        realtime: new WsRealtimeGateway({ url: apiUrl, issueTicket: () => auth.issueWsTicket() }),
      }),
  };
}

export type Container = ReturnType<typeof createContainer>;
