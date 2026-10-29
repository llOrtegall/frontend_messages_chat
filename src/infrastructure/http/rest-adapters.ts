import {
  MemberResponseSchema,
  MessageListResponseSchema,
  RoomDetailResponseSchema,
  RoomListResponseSchema,
  RoomResponseSchema,
  WsTicketResponseSchema,
} from "../../contracts/index.ts";
import type { MessageRepository, RoomRepository } from "../../domain/ports.ts";
import type { ApiHttp } from "../../modules/shared/infrastructure/ApiHttp.ts";

/** Single-use ticket for the WebSocket handshake (keeps the JWT out of URLs). */
export class RestWsTicketIssuer {
  constructor(private readonly http: ApiHttp) {}

  async issue(): Promise<string> {
    return (await this.http.request("POST", "/api/v1/ws/ticket", WsTicketResponseSchema, { body: {} })).ticket;
  }
}

export class RestRoomRepository implements RoomRepository {
  constructor(private readonly http: ApiHttp) {}

  async list() {
    return (await this.http.request("GET", "/api/v1/rooms", RoomListResponseSchema)).rooms;
  }

  async get(roomId: string) {
    return (await this.http.request("GET", `/api/v1/rooms/${roomId}`, RoomDetailResponseSchema)).room;
  }

  async openDirect(targetUserId: string) {
    return (await this.http.request("POST", "/api/v1/rooms", RoomResponseSchema, { body: { targetUserId } })).room;
  }

  async createGroup(name: string, memberIds: string[]) {
    return (await this.http.request("POST", "/api/v1/rooms", RoomResponseSchema, { body: { name, memberIds } })).room;
  }

  async delete(roomId: string) {
    await this.http.request("DELETE", `/api/v1/rooms/${roomId}`, null);
  }

  async addMember(roomId: string, userId: string) {
    await this.http.request("POST", `/api/v1/rooms/${roomId}/members`, MemberResponseSchema, { body: { userId } });
  }

  async removeMember(roomId: string, userId: string) {
    await this.http.request("DELETE", `/api/v1/rooms/${roomId}/members`, null, { body: { userId } });
  }

  async setMemberRole(roomId: string, userId: string, role: "admin" | "member") {
    await this.http.request("PATCH", `/api/v1/rooms/${roomId}/members`, MemberResponseSchema, { body: { userId, role } });
  }
}

export class RestMessageRepository implements MessageRepository {
  constructor(private readonly http: ApiHttp) {}

  async list(roomId: string, { before, limit }: { before?: string; limit?: number } = {}) {
    const res = await this.http.request("GET", `/api/v1/rooms/${roomId}/messages`, MessageListResponseSchema, {
      query: { before, limit },
    });
    return res.messages;
  }
}
