import {
  MessageListResponseSchema,
  WsTicketResponseSchema,
} from "../../contracts/index.ts";
import type { MessageRepository } from "../../domain/ports.ts";
import type { ApiHttp } from "../../modules/shared/infrastructure/ApiHttp.ts";

/** Single-use ticket for the WebSocket handshake (keeps the JWT out of URLs). */
export class RestWsTicketIssuer {
  constructor(private readonly http: ApiHttp) {}

  async issue(): Promise<string> {
    return (await this.http.request("POST", "/api/v1/ws/ticket", WsTicketResponseSchema, { body: {} })).ticket;
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
