"use client";

import { roomTitle } from "../../domain/rules.ts";
import { useChat } from "../providers.tsx";

const formatActivity = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

export function RoomsList({ onNewConversation }: { onNewConversation: () => void }) {
  const { rooms, roomsLoaded, selectedRoomId, unread, store } = useChat();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <button
          onClick={onNewConversation}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition text-sm"
        >
          + Nueva conversación
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!roomsLoaded ? (
          <div className="p-4 text-slate-400 text-sm">Cargando…</div>
        ) : rooms.length === 0 ? (
          <div className="p-4 text-slate-400 text-sm">Sin conversaciones. ¡Crea una!</div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {rooms.map((room) => {
              const count = unread[room.id] ?? 0;
              const selected = selectedRoomId === room.id;
              return (
                <li key={room.id}>
                  <button
                    onClick={() => void store.selectRoom(room.id)}
                    aria-current={selected ? "true" : undefined}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition ${
                      selected ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-200"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${
                          room.kind === "dm" ? "bg-blue-900/60 text-blue-400" : "bg-purple-900/60 text-purple-400"
                        }`}
                      >
                        {room.kind === "dm" ? "DM" : "G"}
                      </span>
                      <span className="font-medium text-sm truncate flex-1">{roomTitle(room)}</span>
                      {count > 0 && !selected && (
                        <span
                          className="shrink-0 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                        >
                          <span aria-hidden>{count > 99 ? "99+" : count}</span>
                          <span className="sr-only">, {count} sin leer</span>
                        </span>
                      )}
                    </span>
                    {room.lastMessageAt && (
                      <span className={`block text-xs mt-0.5 ml-6 ${selected ? "text-blue-100" : "text-slate-400"}`}>
                        {formatActivity(room.lastMessageAt)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
