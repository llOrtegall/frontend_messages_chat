import type {
  CurrentUser,
  Message,
  Room,
  RoomListItem,
  RoomWithMembers,
  ServerEvent,
  UserListItem,
  WsAckPayload,
  WsRequestPayload,
  WsRequestType,
} from "./entities.ts";

/** Session against the backend. The refresh token never reaches the client (HttpOnly cookie). */
export interface AuthGateway {
  login(email: string, password: string): Promise<CurrentUser>;
  register(email: string, password: string, displayName: string): Promise<CurrentUser>;
  /** Restores the session from the refresh cookie; null when there is none or it expired. */
  restore(): Promise<CurrentUser | null>;
  logout(): Promise<void>;
  /** The signed-in user as the server has it now. */
  me(): Promise<CurrentUser>;
  /** Emailed-token flows. The tokens are single use. */
  verifyEmail(token: string): Promise<void>;
  resendVerification(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  /** Also signs out every session of that user, this one included. */
  resetPassword(token: string, newPassword: string): Promise<void>;
  /** Called when the session can no longer be refreshed (expired or revoked elsewhere). */
  onExpired(listener: () => void): () => void;
}

export interface UserDirectory {
  search(params: { query?: string; cursor?: string }): Promise<{ users: UserListItem[]; nextCursor: string | null }>;
}

export interface RoomRepository {
  /** My rooms with my read state. */
  list(): Promise<RoomListItem[]>;
  get(roomId: string): Promise<RoomWithMembers>;
  openDirect(targetUserId: string): Promise<Room>;
  createGroup(name: string, memberIds: string[]): Promise<Room>;
  delete(roomId: string): Promise<void>;
  addMember(roomId: string, userId: string): Promise<void>;
  /** Removing yourself is leaving. */
  removeMember(roomId: string, userId: string): Promise<void>;
  setMemberRole(roomId: string, userId: string, role: "admin" | "member"): Promise<void>;
}

export interface MessageRepository {
  /** Newest-first page of messages older than `before` (a message id). */
  list(roomId: string, params?: { before?: string; limit?: number }): Promise<Message[]>;
}

/** Uploads a file straight to object storage; resolves to the key to attach to a message. */
export interface AttachmentUploader {
  upload(file: Blob): Promise<string>;
}

export type ConnectionStatus = "connecting" | "open" | "closed";

/** Real-time channel (WebSocket). Room subscriptions survive reconnects. */
export interface RealtimeGateway {
  connect(): void;
  disconnect(): void;
  setRooms(roomIds: readonly string[]): void;
  request<T extends WsRequestType>(type: T, payload: WsRequestPayload<T>): Promise<WsAckPayload<T>>;
  /** Fire-and-forget (typing notifications). */
  notify<T extends WsRequestType>(type: T, payload: WsRequestPayload<T>): void;
  onEvent(listener: (event: ServerEvent) => void): () => void;
  onStatus(listener: (status: ConnectionStatus) => void): () => void;
}
