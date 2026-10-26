import type { Message, Room, RoomWithMembers, ServerEvent, WsAckPayload, WsRequestPayload, WsRequestType } from "../src/domain/entities.ts";
import type { AttachmentUploader, ConnectionStatus, MessageRepository, RealtimeGateway, RoomRepository } from "../src/domain/ports.ts";

let seq = 0;
/** UUIDv7-like ids that sort in creation order. */
export const id = () => `01a00000-0000-7000-8000-${(++seq).toString(16).padStart(12, "0")}`;
export const iso = (offsetSec = 0) => new Date(Date.UTC(2026, 0, 1) + offsetSec * 1000).toISOString();

export function room(over: Partial<Room> = {}): Room {
  return { id: id(), kind: "dm", name: null, createdBy: null, lastMessageAt: null, createdAt: iso(), ...over };
}

export function message(roomId: string, over: Partial<Message> = {}): Message {
  return {
    id: id(), roomId, senderId: "other", body: "hi", attachmentKey: null, attachmentMeta: null,
    editedAt: null, deletedAt: null, createdAt: iso(), ...over,
  };
}

export class FakeRealtime implements RealtimeGateway {
  rooms: readonly string[] = [];
  requests: { type: string; payload: unknown }[] = [];
  notifications: { type: string; payload: unknown }[] = [];
  connected = false;
  failNextRequest: Error | null = null;
  private eventListeners = new Set<(e: ServerEvent) => void>();
  private statusListeners = new Set<(s: ConnectionStatus) => void>();

  connect() { this.connected = true; }
  disconnect() { this.connected = false; }
  setRooms(ids: readonly string[]) { this.rooms = ids; }
  async request<T extends WsRequestType>(type: T, payload: WsRequestPayload<T>): Promise<WsAckPayload<T>> {
    this.requests.push({ type, payload });
    if (this.failNextRequest) { const e = this.failNextRequest; this.failNextRequest = null; throw e; }
    return {} as WsAckPayload<T>;
  }
  notify(type: string, payload: unknown) { this.notifications.push({ type, payload }); }
  onEvent(l: (e: ServerEvent) => void) { this.eventListeners.add(l); return () => this.eventListeners.delete(l); }
  onStatus(l: (s: ConnectionStatus) => void) { this.statusListeners.add(l); return () => this.statusListeners.delete(l); }

  emit(event: Omit<ServerEvent, "ts">) { for (const l of this.eventListeners) l({ ts: Date.now(), ...event } as ServerEvent); }
  status(s: ConnectionStatus) { for (const l of this.statusListeners) l(s); }
}

export class FakeRooms implements RoomRepository {
  constructor(public rooms: Room[] = []) {}
  details = new Map<string, RoomWithMembers>();
  unreadCounts = new Map<string, number>();
  async list() {
    return this.rooms.map((r) => ({ ...r, unreadCount: this.unreadCounts.get(r.id) ?? 0, lastReadMessageId: null, peer: null }));
  }
  async get(roomId: string) {
    const d = this.details.get(roomId);
    if (d) return d;
    const r = this.rooms.find((x) => x.id === roomId)!;
    return { ...r, members: [] };
  }
  async openDirect() { const r = room(); this.rooms.push(r); return r; }
  async createGroup(name: string) { const r = room({ kind: "group", name }); this.rooms.push(r); return r; }
  async delete() {}
  calls: { op: string; args: unknown[] }[] = [];
  async addMember(...args: unknown[]) { this.calls.push({ op: "add", args }); }
  async removeMember(...args: unknown[]) { this.calls.push({ op: "remove", args }); }
  async setMemberRole(...args: unknown[]) { this.calls.push({ op: "role", args }); }
}

export class FakeMessages implements MessageRepository {
  pages = new Map<string, Message[]>();
  calls: { roomId: string; before?: string; limit?: number }[] = [];
  async list(roomId: string, params: { before?: string; limit?: number } = {}) {
    this.calls.push({ roomId, ...params });
    const all = (this.pages.get(roomId) ?? []).slice().sort((a, b) => (a.id < b.id ? 1 : -1)); // newest first
    const older = params.before ? all.filter((m) => m.id < params.before!) : all;
    return older.slice(0, params.limit ?? 50);
  }
}

export const flush = () => new Promise((r) => setTimeout(r, 0));

export class FakeAttachments implements AttachmentUploader {
  uploads: Blob[] = [];
  failNext: Error | null = null;
  async upload(file: Blob) {
    if (this.failNext) { const e = this.failNext; this.failNext = null; throw e; }
    this.uploads.push(file);
    return `uploads/me/${this.uploads.length}.png`;
  }
}
