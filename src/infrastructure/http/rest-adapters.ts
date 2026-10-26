import {
  AuthResponseSchema,
  MemberResponseSchema,
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
    return this.me();
  }

  async logout() {
    try {
      await this.http.request("POST", "/api/v1/auth/logout", null, { body: {}, refreshOn401: false });
    } finally {
      this.http.setAccessToken(null);
    }
  }

  async me() {
    return (await this.http.request("GET", "/api/v1/auth/me", UserResponseSchema)).user;
  }

  async updateProfile(changes: { displayName?: string; avatarKey?: string | null }) {
    return (await this.http.request("PATCH", "/api/v1/users/me", UserResponseSchema, { body: changes })).user;
  }

  async verifyEmail(token: string) {
    await this.http.request("POST", "/api/v1/auth/verify-email/confirm", null, { body: { token }, refreshOn401: false });
  }

  async resendVerification() {
    await this.http.request("POST", "/api/v1/auth/verify-email/request", null, { body: {} });
  }

  async requestPasswordReset(email: string) {
    await this.http.request("POST", "/api/v1/auth/password-reset/request", null, { body: { email }, refreshOn401: false });
  }

  async resetPassword(token: string, newPassword: string) {
    await this.http.request("POST", "/api/v1/auth/password-reset/confirm", null, {
      body: { token, newPassword },
      refreshOn401: false,
    });
    this.http.setAccessToken(null);
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
  constructor(private readonly http: HttpClient) {}

  async list(roomId: string, { before, limit }: { before?: string; limit?: number } = {}) {
    const res = await this.http.request("GET", `/api/v1/rooms/${roomId}/messages`, MessageListResponseSchema, {
      query: { before, limit },
    });
    return res.messages;
  }
}
