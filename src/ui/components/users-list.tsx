"use client";

import { useState } from "react";
import { useSession } from "../../hooks/useSession.ts";
import { useChat } from "../providers.tsx";
import { useUserSearch } from "../use-user-search.ts";
import { Avatar } from "./avatar.tsx";
import { messageFor } from "../../i18n/errorMessages.ts";

export function UsersList({ onOpened }: { onOpened: () => void }) {
  const { store, presence } = useChat();
  const me = useSession().user?.toPrimitive() ?? null;
  const [query, setQuery] = useState("");
  const { users, loading, hasMore, loadMore, reload } = useUserSearch(query);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isOnline = (u: { id: string; isOnline: boolean }) => presence[u.id] ?? u.isOnline;
  const onlineCount = users.filter(isOnline).length;

  const openDm = async (userId: string) => {
    setOpening(userId);
    setError("");
    try {
      await store.openDirect(userId);
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
      {error && <p role="alert" className="mx-3 mb-1 text-xs text-red-400">{error}</p>}

      <div className="flex-1 overflow-y-auto">
        {loading && users.length === 0 ? (
          <div className="p-4 text-slate-400 text-sm">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-slate-400 text-sm">{query.trim() ? "Ningún usuario coincide." : "No hay otros usuarios registrados."}</div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => void openDm(u.id)}
                  disabled={opening === u.id}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-left disabled:opacity-60"
                  title="Abrir mensaje directo"
                >
                  <Avatar name={u.displayName} url={u.avatarUrl} />
                  <span className={`shrink-0 w-2 h-2 rounded-full ${isOnline(u) ? "bg-green-400" : "bg-slate-600"}`} aria-hidden />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-slate-200 truncate">{u.displayName}</span>
                    <span className="block text-xs text-slate-400">{isOnline(u) ? "En línea" : "Desconectado"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-blue-400">{opening === u.id ? "…" : "DM"}</span>
                </button>
              </li>
            ))}
            {hasMore && (
              <li>
                <button
                  onClick={() => void loadMore()}
                  disabled={loading}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50 transition"
                >
                  {loading ? "Cargando…" : "Cargar más"}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {me && (
        <div className="p-4 border-t border-slate-700 text-sm">
          <div className="text-slate-100 font-medium">
            {me.displayName} <span className="text-green-400 text-xs">● tú</span>
          </div>
          <div className="text-slate-400 text-xs">{me.email}</div>
        </div>
      )}
    </div>
  );
}
