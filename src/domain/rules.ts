import type { Message, Room, UserSummary } from "./entities.ts";

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

/** A room in the list. `peer` (the other DM member) comes from GET /rooms; push events don't carry it. */
export type ListedRoom = Room & { peer?: UserSummary | null };

export function roomTitle(room: Pick<ListedRoom, "kind" | "name" | "peer">): string {
  return room.kind === "dm" ? room.peer?.displayName || room.name || "Mensaje directo" : room.name || "Grupo sin nombre";
}
