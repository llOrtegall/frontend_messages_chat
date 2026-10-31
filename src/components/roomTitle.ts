import type { ListedRoom } from "../modules/room/domain/ListedRoom.ts";

/** A room's title, with a placeholder while a direct room's other member isn't known yet. */
export const roomTitle = (room: ListedRoom): string => room.title() ?? (room.isDirect() ? "Mensaje directo" : "Grupo sin nombre");
