import { ChatStore } from "./application/chat-store.ts";
import type { MessageRepository, RoomRepository } from "./domain/ports.ts";
import type { ApiHttp } from "./modules/shared/infrastructure/ApiHttp.ts";
import { attachmentModule } from "./modules/attachment/application/factory.ts";
import { messageModule, type MessageModule } from "./modules/message/application/factory.ts";
import { roomModule, type RoomModule } from "./modules/room/application/factory.ts";
import { RestWsTicketIssuer } from "./infrastructure/http/rest-adapters.ts";
import { WsRealtimeGateway } from "./infrastructure/realtime/ws-realtime-gateway.ts";

/** The ChatStore still keeps the contract's plain shapes; it goes away with the chat module (F5). */
export const legacyRoomPort = (rooms: RoomModule): RoomRepository => ({
  list: async () => [...(await rooms.listRooms()).toPrimitive()].map((room) => ({ ...room })),
  get: async (roomId) => {
    const room = (await rooms.findRoom(roomId)).toPrimitive();
    return { ...room, members: [...room.members] };
  },
  openDirect: async (userId) => (await rooms.openDirectRoom(userId)).toPrimitive(),
  createGroup: async (name, memberIds) => (await rooms.createGroupRoom({ name, memberIds })).toPrimitive(),
  delete: (roomId) => rooms.deleteRoom(roomId),
  addMember: async (roomId, userId) => void (await rooms.addMember({ roomId, userId })),
  removeMember: (roomId, userId) => rooms.removeMember({ roomId, userId }),
  setMemberRole: async (roomId, userId, role) => void (await rooms.changeMemberRole({ roomId, userId, role })),
});

export const legacyMessagePort = (messages: MessageModule, pageSize: number): MessageRepository => ({
  list: async (roomId, { before, limit } = {}) =>
    [...(await messages.listMessages({ roomId, before: before ?? null, limit: limit ?? pageSize })).toPrimitive()].map((message) => ({ ...message })),
});

/** Legacy wiring for the part not yet moved to modules/ (realtime and the chat state). */
const CHAT_PAGE_SIZE = 50;

export function createContainer(http: ApiHttp, apiUrl: string) {
  const rooms = legacyRoomPort(roomModule(http));
  const messages = legacyMessagePort(messageModule(http), CHAT_PAGE_SIZE);
  const tickets = new RestWsTicketIssuer(http);
  const { uploadAttachment } = attachmentModule(http);
  const attachments = { upload: async (file: Blob) => (await uploadAttachment(file)).toPrimitive() };

  return {
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
