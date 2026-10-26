import type { AttachmentContentType, AttachmentMeta, CurrentUser, Message, Room, RoomMember, RoomWithMembers, UserSummary } from "./entities.ts";

// Message ids are UUIDv7, so lexical order is chronological order.
const byId = (a: Message, b: Message) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Inserts or replaces a message keeping the list sorted and free of duplicates. */
export function upsertMessage(messages: readonly Message[], message: Message): Message[] {
  const i = messages.findIndex((m) => m.id === message.id);
  if (i >= 0) return messages.map((m, j) => (j === i ? message : m));
  return [...messages, message].sort(byId);
}

/** Merges an older page into the list (history pagination). */
export function mergeMessages(messages: readonly Message[], page: readonly Message[]): Message[] {
  const known = new Set(messages.map((m) => m.id));
  return [...messages, ...page.filter((m) => !known.has(m.id))].sort(byId);
}

export function removeMessage(messages: readonly Message[], messageId: string): Message[] {
  return messages.filter((m) => m.id !== messageId);
}

const lastActivity = (r: Room) => Date.parse(r.lastMessageAt ?? r.createdAt);

/** Most recently active rooms first. */
export function sortRoomsByActivity(rooms: readonly Room[]): Room[] {
  return [...rooms].sort((a, b) => lastActivity(b) - lastActivity(a));
}

export function touchRoom(rooms: readonly Room[], roomId: string, at: string): Room[] {
  return sortRoomsByActivity(rooms.map((r) => (r.id === roomId ? { ...r, lastMessageAt: at } : r)));
}

export function upsertRoom(rooms: readonly Room[], room: Room): Room[] {
  return sortRoomsByActivity([...rooms.filter((r) => r.id !== room.id), room]);
}

export function canEditMessage(message: Message, user: CurrentUser | null): boolean {
  return user !== null && message.senderId === user.id && message.deletedAt === null;
}

/** DMs can be deleted by either member; groups only by their owner (enforced by the backend too). */
export function canDeleteRoom(room: RoomWithMembers, user: CurrentUser | null): boolean {
  if (!user) return false;
  if (room.kind === "dm") return true;
  return room.members.some((m) => m.userId === user.id && m.role === "owner");
}

/** A room in the list. `peer` (the other DM member) comes from GET /rooms; push events don't carry it. */
export type ListedRoom = Room & { peer?: UserSummary | null };

export function roomTitle(room: Pick<ListedRoom, "kind" | "name" | "peer">): string {
  return room.kind === "dm" ? room.peer?.displayName || room.name || "Mensaje directo" : room.name || "Grupo sin nombre";
}

// Group membership rules, mirroring the backend (which enforces them).
const roleOf = (room: RoomWithMembers, userId: string) => room.members.find((m) => m.userId === userId)?.role ?? null;

export function canAddMembers(room: RoomWithMembers, me: CurrentUser): boolean {
  const role = roleOf(room, me.id);
  return room.kind === "group" && (role === "owner" || role === "admin");
}

/** Removing someone else: owner removes anyone but themselves; admins remove plain members. */
export function canRemoveMember(room: RoomWithMembers, me: CurrentUser, target: RoomMember): boolean {
  if (room.kind !== "group" || target.userId === me.id) return false;
  const role = roleOf(room, me.id);
  return role === "owner" ? target.role !== "owner" : role === "admin" && target.role === "member";
}

export function canChangeRole(room: RoomWithMembers, me: CurrentUser, target: RoomMember): boolean {
  return room.kind === "group" && roleOf(room, me.id) === "owner" && target.role !== "owner";
}

/** The owner can't leave (they delete the group instead); DMs are deleted, not left. */
export function canLeave(room: RoomWithMembers, me: CurrentUser): boolean {
  const role = roleOf(room, me.id);
  return room.kind === "group" && role !== null && role !== "owner";
}

/** Sender label in group chats; people who left the group are no longer listed. */
export function senderName(room: RoomWithMembers | null, userId: string): string {
  return room?.members.find((m) => m.userId === userId)?.displayName ?? "Antiguo miembro";
}

// `satisfies` keeps this in lockstep with the backend's allowlist: a missing or extra type fails typecheck.
const ATTACHMENT_TYPES = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
  "image/gif": true,
  "application/pdf": true,
  "text/plain": true,
} as const satisfies Record<AttachmentContentType, true>;

/** Value for `<input type="file" accept>`. */
export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES).join(",");
/** Avatars: the image subset. */
export const AVATAR_ACCEPT = Object.keys(ATTACHMENT_TYPES).filter((t) => t.startsWith("image/")).join(",");

export const isImageAttachment = (meta: Pick<AttachmentMeta, "contentType">) => meta.contentType.startsWith("image/");

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
