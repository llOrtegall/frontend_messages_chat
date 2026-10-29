import { ChatStore } from "./application/chat-store.ts";
import type { RoomRepository } from "./domain/ports.ts";
import type { ApiHttp } from "./modules/shared/infrastructure/ApiHttp.ts";
import { attachmentModule } from "./modules/attachment/application/factory.ts";
import { roomModule, type RoomModule } from "./modules/room/application/factory.ts";
import { RestMessageRepository, RestWsTicketIssuer } from "./infrastructure/http/rest-adapters.ts";
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

/** Legacy wiring for the parts not yet moved to modules/ (messages, realtime). */
export function createContainer(http: ApiHttp, apiUrl: string) {
  const rooms = legacyRoomPort(roomModule(http));
  const messages = new RestMessageRepository(http);
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
