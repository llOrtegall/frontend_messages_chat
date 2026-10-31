"use client";

import { useState } from "react";
import { useSession } from "../hooks/useSession.ts";
import { useChat } from "../hooks/useChat.ts";
import { useUserSearch } from "../hooks/useUserSearch.ts";
import type { User } from "../modules/user/domain/User.ts";
import { UserItem } from "./UserItem.tsx";
import { messageFor } from "../i18n/errorMessages.ts";

export function UsersList({ onOpened }: { onOpened: () => void }) {
  const { chat, session } = useChat();
  const me = useSession().user;
  const [query, setQuery] = useState("");
  const { found, isLoading, failure, hasMore, loadMore, reload } = useUserSearch(query);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isOnline = (user: User) => chat.isOnline(user.getId(), user.isOnline());
  const onlineCount = found.countWhere(isOnline);

  const openDm = async (userId: string) => {
    setOpening(userId);
    setError("");
    try {
      await session.openDirect(userId);
      onOpened();
    } catch (err) {
      setError(messageFor(err, "room.open_direct"));
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o email exacto"
          aria-label="Buscar usuarios"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <span className="text-xs text-slate-400">
          {onlineCount} conectado{onlineCount !== 1 ? "s" : ""}
        </span>
        <button onClick={() => void reload()} className="text-xs text-slate-400 hover:text-slate-300 transition" title="Recargar" aria-label="Recargar">
          ↺
        </button>
      </div>
      {(error || failure !== null) && (
        <p role="alert" className="mx-3 mb-1 text-xs text-red-400">{error || messageFor(failure, "users.search")}</p>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && found.isEmpty() ? (
          <div className="p-4 text-slate-400 text-sm">Cargando…</div>
        ) : found.isEmpty() ? (
          <div className="p-4 text-slate-400 text-sm">{query.trim() ? "Ningún usuario coincide." : "No hay otros usuarios registrados."}</div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {found.map((user) => {
              const id = user.getId().toPrimitive();
              return (
                <li key={id}>
                  <UserItem user={user} isOnline={isOnline(user)} isOpening={opening === id} onOpen={() => void openDm(id)} />
                </li>
              );
            })}
            {hasMore && (
              <li>
                <button
                  onClick={() => void loadMore()}
                  disabled={isLoading}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50 transition"
                >
                  {isLoading ? "Cargando…" : "Cargar más"}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {me && (
        <div className="p-4 border-t border-slate-700 text-sm">
          <div className="text-slate-100 font-medium">
            {me.getDisplayName().toPrimitive()} <span className="text-green-400 text-xs">● tú</span>
          </div>
          <div className="text-slate-400 text-xs">{me.getEmail().toPrimitive()}</div>
        </div>
      )}
    </div>
  );
}
