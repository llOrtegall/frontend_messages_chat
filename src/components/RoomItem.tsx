import type { ListedRoom } from "../modules/room/domain/ListedRoom.ts";
import { roomTitle } from "./roomTitle.ts";

const MAX_SHOWN_UNREAD = 99;

const formatActivity = (at: Date) => at.toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

interface RoomItemProps {
  readonly room: ListedRoom;
  readonly isOpen: boolean;
  readonly onOpen: () => void;
}

export const RoomItem = ({ room, isOpen, onOpen }: RoomItemProps) => {
  const now = new Date();
  const unread = room.noticeableUnreadAt(now);
  const isMuted = room.isMutedAt(now);
  const lastMessageAt = room.getLastMessageAt();
  return (
    <button
      onClick={onOpen}
      aria-current={isOpen ? "true" : undefined}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition ${isOpen ? "bg-blue-700 text-white" : "hover:bg-slate-800 text-slate-200"}`}
    >
      <span className="flex items-center gap-2">
        <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${room.isDirect() ? "bg-blue-950 text-blue-200" : "bg-purple-950 text-purple-200"}`}>
          {room.isDirect() ? "DM" : "G"}
        </span>
        <span className="font-medium text-sm truncate flex-1">{roomTitle(room)}</span>
        {isMuted && (
          <span className="shrink-0 text-xs" title="Silenciada">
            <span aria-hidden>🔕</span>
            <span className="sr-only">, silenciada</span>
          </span>
        )}
        {unread > 0 && !isOpen && (
          <span className="shrink-0 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            <span aria-hidden>{unread > MAX_SHOWN_UNREAD ? `${MAX_SHOWN_UNREAD}+` : unread}</span>
            <span className="sr-only">, {unread} sin leer</span>
          </span>
        )}
      </span>
      {lastMessageAt && (
        <span className={`block text-xs mt-0.5 ml-6 ${isOpen ? "text-blue-100" : "text-slate-400"}`}>{formatActivity(lastMessageAt)}</span>
      )}
    </button>
  );
};
