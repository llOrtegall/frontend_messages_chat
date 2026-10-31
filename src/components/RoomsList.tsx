"use client";

import { useChat } from "../hooks/useChat.ts";
import { RoomItem } from "./RoomItem.tsx";

export function RoomsList({ onNewConversation }: { onNewConversation: () => void }) {
  const { chat, session } = useChat();
  const rooms = chat.getRooms();
  const openRoomId = chat.getOpenRoomId();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <button onClick={onNewConversation} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition text-sm">
          + Nueva conversación
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rooms === null ? (
          <div className="p-4 text-slate-400 text-sm">Cargando…</div>
        ) : rooms.isEmpty() ? (
          <div className="p-4 text-slate-400 text-sm">Sin conversaciones. ¡Crea una!</div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {rooms.map((room) => (
              <li key={room.getId().toPrimitive()}>
                <RoomItem
                  room={room}
                  isOpen={openRoomId?.equals(room.getId()) ?? false}
                  onOpen={() => void session.selectRoom(room.getId().toPrimitive())}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
