import {
  ServerFrameSchema,
  WsRequests,
  WsTicketResponseSchema,
  type ServerEvent,
  type ServerFrame,
  type WsAckPayload,
  type WsRequestPayload,
  type WsRequestType,
} from "../../../contracts/index.ts";
import { Message } from "../../message/domain/Message.ts";
import type { MessageBody } from "../../message/domain/MessageBody.ts";
import type { MessageDraft } from "../../message/domain/MessageDraft.ts";
import { MessageId } from "../../message/domain/MessageId.ts";
import { ListedRoom } from "../../room/domain/ListedRoom.ts";
import { RoomId } from "../../room/domain/RoomId.ts";
import { RoomMember } from "../../room/domain/RoomMember.ts";
import { RequestFailedError } from "../../shared/domain/errors/RequestFailedError.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import { readContract } from "../../shared/infrastructure/readContract.ts";
import { UserId } from "../../user/domain/UserId.ts";
import type { ChatEvent } from "../domain/ChatEvent.ts";
import type { ConnectionStatus } from "../domain/ConnectionStatus.ts";
import type { RealtimeRepository } from "../domain/RealtimeRepository.ts";

export interface WsRealtimeOptions {
  readonly heartbeatMs?: number;
  readonly requestTimeoutMs?: number;
  readonly maxBackoffMs?: number;
}

interface Pending {
  readonly type: WsRequestType;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

const DEFAULTS = { heartbeatMs: 20_000, requestTimeoutMs: 10_000, maxBackoffMs: 30_000 };
/** The backend accepts at most 50 room ids per subscribe/unsubscribe. */
const SUBSCRIBE_CHUNK = 50;
const MAX_BACKOFF_STEPS = 10;
const NORMAL_CLOSURE = 1000;

const toEvent = (frame: ServerEvent): ChatEvent => {
  switch (frame.type) {
    case "message.created":
    case "message.edited":
      return { type: frame.type, message: Message.fromPrimitive(frame.payload) };
    case "message.deleted":
      return { type: frame.type, roomId: RoomId.fromPrimitive(frame.payload.roomId), messageId: MessageId.fromPrimitive(frame.payload.messageId) };
    case "message.read":
      return {
        type: frame.type,
        roomId: RoomId.fromPrimitive(frame.payload.roomId),
        userId: UserId.fromPrimitive(frame.payload.userId),
        messageId: MessageId.fromPrimitive(frame.payload.messageId),
      };
    case "user.typing":
      return { type: frame.type, roomId: RoomId.fromPrimitive(frame.payload.roomId), userId: UserId.fromPrimitive(frame.payload.userId) };
    case "presence.online":
    case "presence.offline":
      return { type: "presence.changed", userId: UserId.fromPrimitive(frame.payload.userId), isOnline: frame.type === "presence.online" };
    case "room.added":
      return { type: frame.type, room: ListedRoom.joined(frame.payload.room) };
    case "room.removed":
      return { type: frame.type, roomId: RoomId.fromPrimitive(frame.payload.roomId) };
    case "room.member_added":
    case "room.member_updated":
      return {
        type: frame.type === "room.member_added" ? "member.joined" : "member.updated",
        roomId: RoomId.fromPrimitive(frame.payload.roomId),
        member: RoomMember.fromPrimitive(frame.payload.member),
      };
    case "room.member_removed":
      return { type: "member.left", roomId: RoomId.fromPrimitive(frame.payload.roomId), userId: UserId.fromPrimitive(frame.payload.userId) };
  }
};

/** The WebSocket to the backend, opened with a single-use ticket so the access token never travels in a URL. */
export class WsRealtimeRepository implements RealtimeRepository {
  private socket: WebSocket | null = null;
  private isActive = false;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private watched = new Set<string>();
  private readonly pending = new Map<string, Pending>();
  private readonly eventListeners = new Set<(event: ChatEvent) => void>();
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();
  private readonly options: Required<WsRealtimeOptions>;

  constructor(
    private readonly http: ApiHttp,
    private readonly apiUrl: string,
    options: WsRealtimeOptions = {},
  ) {
    this.options = { ...DEFAULTS, ...options };
  }

  connect(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.attempts = 0;
    void this.open();
  }

  disconnect(): void {
    this.isActive = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close(NORMAL_CLOSURE);
    this.teardown();
  }

  watchRooms(roomIds: readonly RoomId[]): void {
    const next = new Set(roomIds.map((id) => id.toPrimitive()));
    const added = [...next].filter((id) => !this.watched.has(id));
    const removed = [...this.watched].filter((id) => !next.has(id));
    this.watched = next;
    if (!this.isOpen()) return;
    this.sendInChunks("chat.subscribe", added);
    this.sendInChunks("chat.unsubscribe", removed);
  }

  async send(draft: MessageDraft): Promise<MessageId> {
    const { roomId, body, attachmentKey, clientMessageId } = draft.toPrimitive();
    const ack = await this.request("chat.send", { roomId, body, attachmentKey: attachmentKey ?? undefined, clientMessageId });
    return MessageId.fromPrimitive(ack.id);
  }

  async edit(messageId: MessageId, body: MessageBody): Promise<void> {
    await this.request("chat.edit", { messageId: messageId.toPrimitive(), body: body.toPrimitive() });
  }

  async delete(messageId: MessageId): Promise<void> {
    await this.request("chat.delete", { messageId: messageId.toPrimitive() });
  }

  async markRead(roomId: RoomId, messageId: MessageId): Promise<void> {
    await this.request("chat.read", { roomId: roomId.toPrimitive(), messageId: messageId.toPrimitive() });
  }

  notifyTyping(roomId: RoomId): void {
    this.notify("chat.typing", { roomId: roomId.toPrimitive() });
  }

  onEvent(listener: (event: ChatEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private request<T extends WsRequestType>(type: T, payload: WsRequestPayload<T>): Promise<WsAckPayload<T>> {
    if (!this.isOpen()) return Promise.reject(new RequestFailedError(RequestFailedError.DISCONNECTED, null, "Not connected"));
    const refId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(refId);
        reject(new RequestFailedError(RequestFailedError.TIMEOUT, null, `No answer to ${type}`));
      }, this.options.requestTimeoutMs);
      this.pending.set(refId, { type, resolve: resolve as (value: unknown) => void, reject, timer });
      this.socket!.send(JSON.stringify({ type, refId, payload }));
    });
  }

  private notify<T extends WsRequestType>(type: T, payload: WsRequestPayload<T>): void {
    if (this.isOpen()) this.socket!.send(JSON.stringify({ type, payload }));
  }

  private isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private async open(): Promise<void> {
    this.setStatus("connecting");
    let ticket: string;
    try {
      ticket = (await this.http.request("POST", "/api/v1/ws/ticket", WsTicketResponseSchema, { body: {} })).ticket;
    } catch {
      // Offline or the session ended: keep retrying with backoff; an ended session signs the user out elsewhere.
      this.setStatus("closed");
      this.scheduleReconnect();
      return;
    }
    if (!this.isActive) return;

    const url = new URL("/ws", this.apiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("ticket", ticket);
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.attempts = 0;
      this.sendInChunks("chat.subscribe", [...this.watched]);
      this.heartbeatTimer = setInterval(() => this.notify("presence.heartbeat", {}), this.options.heartbeatMs);
      this.setStatus("open");
    };
    socket.onmessage = (message) => this.handleFrame(message.data);
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.teardown();
      if (this.isActive) this.scheduleReconnect();
    };
  }

  private handleFrame(raw: unknown): void {
    let data: unknown;
    try {
      data = JSON.parse(String(raw));
    } catch {
      console.warn("Ignoring a WebSocket frame that is not JSON");
      return;
    }
    const parsed = readContract(ServerFrameSchema, data);
    if (!parsed.success) {
      console.warn("Ignoring a WebSocket frame that does not match the contract", parsed.error.issues);
      return;
    }
    const frame = parsed.data;
    if (frame.type === "pong") return;
    if (frame.type === "ack" || frame.type === "error") {
      this.settle(frame);
      return;
    }
    this.emit(frame);
  }

  private settle(frame: Extract<ServerFrame, { type: "ack" | "error" }>): void {
    const pending = frame.refId ? this.pending.get(frame.refId) : undefined;
    if (!pending) return;
    this.pending.delete(frame.refId!);
    clearTimeout(pending.timer);
    if (frame.type === "error") {
      pending.reject(new RequestFailedError(frame.payload.code, null, frame.payload.message));
      return;
    }
    const ack = readContract(WsRequests[pending.type].ack, frame.payload);
    if (ack.success) pending.resolve(ack.data);
    else pending.reject(new RequestFailedError(RequestFailedError.UNEXPECTED_RESPONSE, null, `Unexpected ack to ${pending.type}`));
  }

  private emit(frame: ServerEvent): void {
    let event: ChatEvent;
    try {
      event = toEvent(frame);
    } catch (error) {
      console.warn(`Ignoring a ${frame.type} event this app can't represent`, error);
      return;
    }
    for (const listener of this.eventListeners) listener(event);
  }

  private sendInChunks(type: "chat.subscribe" | "chat.unsubscribe", roomIds: readonly string[]): void {
    for (let start = 0; start < roomIds.length; start += SUBSCRIBE_CHUNK) {
      this.notify(type, { roomIds: roomIds.slice(start, start + SUBSCRIBE_CHUNK) });
    }
  }

  private scheduleReconnect(): void {
    if (!this.isActive || this.reconnectTimer) return;
    const base = Math.min(1000 * 2 ** this.attempts, this.options.maxBackoffMs);
    this.attempts = Math.min(this.attempts + 1, MAX_BACKOFF_STEPS);
    // Jitter, so clients dropped together don't all come back at the same instant.
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.open();
    }, base / 2 + Math.random() * (base / 2));
  }

  private teardown(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new RequestFailedError(RequestFailedError.DISCONNECTED, null, "Connection lost"));
    }
    this.pending.clear();
    this.setStatus("closed");
  }

  private setStatus(status: ConnectionStatus): void {
    for (const listener of this.statusListeners) listener(status);
  }
}
