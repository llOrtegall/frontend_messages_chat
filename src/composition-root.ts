import { ChatStore } from "./application/chat-store.ts";
import type { ApiHttp } from "./modules/shared/infrastructure/ApiHttp.ts";
import { attachmentModule } from "./modules/attachment/application/factory.ts";
import { RestMessageRepository, RestRoomRepository, RestUserDirectory, RestWsTicketIssuer } from "./infrastructure/http/rest-adapters.ts";
import { WsRealtimeGateway } from "./infrastructure/realtime/ws-realtime-gateway.ts";

/** Legacy wiring for the parts not yet moved to modules/ (users, rooms, messages, realtime). */
export function createContainer(http: ApiHttp, apiUrl: string) {
  const rooms = new RestRoomRepository(http);
  const messages = new RestMessageRepository(http);
  const tickets = new RestWsTicketIssuer(http);
  const { uploadAttachment } = attachmentModule(http);
  const attachments = { upload: async (file: Blob) => (await uploadAttachment(file)).toPrimitive() };

  return {
    users: new RestUserDirectory(http),
    createChat: (currentUserId: string) =>
      new ChatStore({
        currentUserId,
        rooms,
        messages,
        attachments,
        realtime: new WsRealtimeGateway({ url: apiUrl, issueTicket: () => tickets.issue() }),
      }),
  };
}

export type Container = ReturnType<typeof createContainer>;
