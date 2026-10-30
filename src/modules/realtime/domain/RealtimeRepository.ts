import type { MessageBody } from "../../message/domain/MessageBody.ts";
import type { MessageDraft } from "../../message/domain/MessageDraft.ts";
import type { MessageId } from "../../message/domain/MessageId.ts";
import type { RoomId } from "../../room/domain/RoomId.ts";
import type { ChatEvent } from "./ChatEvent.ts";
import type { ConnectionStatus } from "./ConnectionStatus.ts";

/** The realtime channel. It reconnects on its own and keeps watching the same rooms across reconnects. */
export interface RealtimeRepository {
  connect(): void;
  disconnect(): void;
  watchRooms(roomIds: readonly RoomId[]): void;
  send(draft: MessageDraft): Promise<MessageId>;
  edit(messageId: MessageId, body: MessageBody): Promise<void>;
  delete(messageId: MessageId): Promise<void>;
  markRead(roomId: RoomId, messageId: MessageId): Promise<void>;
  /** Fire-and-forget: a lost typing notice doesn't matter. */
  notifyTyping(roomId: RoomId): void;
  onEvent(listener: (event: ChatEvent) => void): () => void;
  onStatus(listener: (status: ConnectionStatus) => void): () => void;
}
