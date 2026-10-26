import {
  AuthResponseSchema,
  MessageListResponseSchema,
  RoomDetailResponseSchema,
  RoomListResponseSchema,
  RoomResponseSchema,
  UserListResponseSchema,
  UserResponseSchema,
  WsTicketResponseSchema,
} from "../../contracts/index.ts";
import type { AuthGateway, MessageRepository, RoomRepository, UserDirectory } from "../../domain/ports.ts";
import type { HttpClient } from "./http-client.ts";

export class RestAuthGateway implements AuthGateway {
  constructor(private readonly http: HttpClient) {}

  async login(email: string, password: string) {
    const res = await this.http.request("POST", "/api/v1/auth/login", AuthResponseSchema, {
      body: { email, password },
      refreshOn401: false,
    });
    this.http.setAccessToken(res.accessToken);
    return res.user;
  }

  async register(email: string, password: string, displayName: string) {
    const res = await this.http.request("POST", "/api/v1/auth/register", AuthResponseSchema, {
      body: { email, password, displayName },
      refreshOn401: false,
    });
    this.http.setAccessToken(res.accessToken);
    return res.user;
  }

  async restore() {
    if (!(await this.http.refresh())) return null;
    return (await this.http.request("GET", "/api/v1/auth/me", UserResponseSchema)).user;
  }

  async logout() {
    try {
      await this.http.request("POST", "/api/v1/auth/logout", null, { body: {}, refreshOn401: false });
    } finally {
      this.http.setAccessToken(null);
    }
  }

  onExpired(listener: () => void) {
    return this.http.onExpired(listener);
  }

  /** Single-use ticket for the WebSocket handshake (keeps the JWT out of URLs). */
  async issueWsTicket(): Promise<string> {
    return (await this.http.request("POST", "/api/v1/ws/ticket", WsTicketResponseSchema, { body: {} })).ticket;
  }
}

export class RestUserDirectory implements UserDirectory {
  constructor(private readonly http: HttpClient) {}

  search({ query, cursor }: { query?: string; cursor?: string }) {
    return this.http.request("GET", "/api/v1/users", UserListResponseSchema, { query: { q: query?.trim(), cursor } });
  }
}

export class RestRoomRepository implements RoomRepository {
  constructor(private readonly http: HttpClient) {}

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
}

export class RestMessageRepository implements MessageRepository {
  constructor(private readonly http: HttpClient) {}

  async list(roomId: string, { before, limit }: { before?: string; limit?: number } = {}) {
    const res = await this.http.request("GET", `/api/v1/rooms/${roomId}/messages`, MessageListResponseSchema, {
      query: { before, limit },
    });
    return res.messages;
  }
}
