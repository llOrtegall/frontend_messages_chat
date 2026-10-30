import { MessageListResponseSchema } from "../../../contracts/index.ts";
import type { RoomId } from "../../room/domain/RoomId.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import type { MessageId } from "../domain/MessageId.ts";
import { MessageList } from "../domain/MessageList.ts";
import type { MessageRepository } from "../domain/MessageRepository.ts";

export class HttpMessageRepository implements MessageRepository {
  constructor(private readonly http: ApiHttp) {}

  async listPage(roomId: RoomId, before: MessageId | null, limit: number): Promise<MessageList> {
    const { messages } = await this.http.request("GET", `/api/v1/rooms/${roomId.toPrimitive()}/messages`, MessageListResponseSchema, {
      query: { before: before?.toPrimitive(), limit },
    });
    return MessageList.fromPrimitive(messages);
  }
}
