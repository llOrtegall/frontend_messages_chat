import { ServerFrameSchema, WsRequests, type ServerEvent, type ServerFrame } from "../../contracts/index.ts";
import type { WsAckPayload, WsRequestPayload, WsRequestType } from "../../domain/entities.ts";
import type { ConnectionStatus, RealtimeGateway } from "../../domain/ports.ts";

interface Options {
  /** Backend base URL (http/https); the socket goes to `${url}/ws` with ws/wss. */
  url: string;
  /** Single-use handshake ticket; requested again for every (re)connect. */
  issueTicket: () => Promise<string>;
  heartbeatMs?: number;
  requestTimeoutMs?: number;
  maxBackoffMs?: number;
  createSocket?: (url: string) => WebSocket;
}

interface Pending {
  type: WsRequestType;
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** The backend accepts at most 50 room ids per subscribe/unsubscribe. */
const SUBSCRIBE_CHUNK = 50;

export class WsRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "WsRequestError";
  }
}

export class WsRealtimeGateway implements RealtimeGateway {
  private ws: WebSocket | null = null;
  private active = false;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  /** Rooms the app wants; re-subscribed on every reconnect. */
  private rooms = new Set<string>();
  private readonly pending = new Map<string, Pending>();
  private readonly eventListeners = new Set<(e: ServerEvent) => void>();
  private readonly statusListeners = new Set<(s: ConnectionStatus) => void>();
  private readonly opts: Required<Omit<Options, "createSocket">> & Pick<Options, "createSocket">;

  constructor(options: Options) {
    this.opts = { heartbeatMs: 20_000, requestTimeoutMs: 10_000, maxBackoffMs: 30_000, ...options };
  }

  connect(): void {
    if (this.active) return;
    this.active = true;
    this.attempts = 0;
    void this.open();
  }

  disconnect(): void {
    this.active = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close(1000);
    this.teardown();
  }

  setRooms(roomIds: readonly string[]): void {
    const next = new Set(roomIds);
    const added = [...next].filter((id) => !this.rooms.has(id));
    const removed = [...this.rooms].filter((id) => !next.has(id));
    this.rooms = next;
    if (this.isOpen()) {
      this.sendChunks("chat.subscribe", added);
      this.sendChunks("chat.unsubscribe", removed);
    }
  }

  request<T extends WsRequestType>(type: T, payload: WsRequestPayload<T>): Promise<WsAckPayload<T>> {
    if (!this.isOpen()) return Promise.reject(new WsRequestError("DISCONNECTED", "Sin conexión con el servidor"));
    const refId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(refId);
        reject(new WsRequestError("TIMEOUT", "El servidor no respondió a tiempo"));
      }, this.opts.requestTimeoutMs);
      this.pending.set(refId, { type, resolve: resolve as (v: unknown) => void, reject, timer });
      this.ws!.send(JSON.stringify({ type, refId, payload }));
    });
  }

  notify<T extends WsRequestType>(type: T, payload: WsRequestPayload<T>): void {
    if (this.isOpen()) this.ws!.send(JSON.stringify({ type, payload }));
  }

  onEvent(listener: (event: ServerEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private async open(): Promise<void> {
    this.setStatus("connecting");
    let ticket: string;
    try {
      ticket = await this.opts.issueTicket();
    } catch {
      this.setStatus("closed");
      this.scheduleReconnect();
      return;
    }
    if (!this.active) return;

    const url = new URL("/ws", this.opts.url);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("ticket", ticket);
    const ws = this.opts.createSocket ? this.opts.createSocket(url.toString()) : new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      this.sendChunks("chat.subscribe", [...this.rooms]);
      this.heartbeatTimer = setInterval(() => this.notify("presence.heartbeat", {}), this.opts.heartbeatMs);
      this.setStatus("open");
    };
    ws.onmessage = (e) => this.handleFrame(e.data);
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.teardown();
      if (this.active) this.scheduleReconnect();
    };
  }

  private handleFrame(raw: unknown): void {
    let data: unknown;
    try {
      data = JSON.parse(String(raw));
    } catch {
      return;
    }
    const parsed = ServerFrameSchema.safeParse(data);
    if (!parsed.success) {
      console.warn("Ignoring WS frame that does not match the contract", parsed.error.issues, data);
      return;
    }
    const frame: ServerFrame = parsed.data;

    if (frame.type === "ack" || frame.type === "error") {
      const pending = frame.refId ? this.pending.get(frame.refId) : undefined;
      if (!pending) return;
      this.pending.delete(frame.refId!);
      clearTimeout(pending.timer);
      if (frame.type === "error") {
        pending.reject(new WsRequestError(frame.payload.code, frame.payload.message));
        return;
      }
      const ack = WsRequests[pending.type].ack.safeParse(frame.payload);
      if (ack.success) pending.resolve(ack.data);
      else pending.reject(new WsRequestError("BAD_ACK", "Respuesta inesperada del servidor"));
      return;
    }
    if (frame.type === "pong") return;
    for (const l of this.eventListeners) l(frame);
  }

  private sendChunks(type: "chat.subscribe" | "chat.unsubscribe", roomIds: string[]): void {
    for (let i = 0; i < roomIds.length; i += SUBSCRIBE_CHUNK) {
      this.notify(type, { roomIds: roomIds.slice(i, i + SUBSCRIBE_CHUNK) });
    }
  }

  private scheduleReconnect(): void {
    if (!this.active || this.reconnectTimer) return;
    const base = Math.min(1000 * 2 ** this.attempts, this.opts.maxBackoffMs);
    this.attempts = Math.min(this.attempts + 1, 10);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.open();
    }, base / 2 + Math.random() * (base / 2)); // jitter so clients don't reconnect in lockstep
  }

  private teardown(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new WsRequestError("DISCONNECTED", "Se perdió la conexión con el servidor"));
    }
    this.pending.clear();
    this.setStatus("closed");
  }

  private setStatus(status: ConnectionStatus): void {
    for (const l of this.statusListeners) l(status);
  }
}
