import {
  WsTicketResponseSchema,
} from "../../contracts/index.ts";
import type { ApiHttp } from "../../modules/shared/infrastructure/ApiHttp.ts";

/** Single-use ticket for the WebSocket handshake (keeps the JWT out of URLs). */
export class RestWsTicketIssuer {
  constructor(private readonly http: ApiHttp) {}

  async issue(): Promise<string> {
    return (await this.http.request("POST", "/api/v1/ws/ticket", WsTicketResponseSchema, { body: {} })).ticket;
  }
}
