"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, type UserListItem } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const SEARCH_DEBOUNCE_MS = 300;

interface UsersListProps {
  onStartDm: (roomId: string) => void;
}

export function UsersList({ onStartDm }: UsersListProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const { user: me } = useAuth();

  const load = useCallback(async (q: string, cursor?: string) => {
    try {
      setLoading(true);
      const page = await apiClient.listUsers({ q: q.trim() || undefined, cursor });
      setUsers((prev) => (cursor ? [...prev, ...page.users] : page.users));
      setNextCursor(page.nextCursor);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => load(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, load]);

  const handleDm = async (userId: string) => {
    setStarting(userId);
    try {
      const room = await apiClient.createDirectRoom(userId);
      onStartDm(room.id);
    } catch {
      // silent
    } finally {
      setStarting(null);
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
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <span className="text-xs text-slate-500">{users.filter((u) => u.isOnline).length} conectado{users.filter((u) => u.isOnline).length !== 1 ? "s" : ""}</span>
        <button
          onClick={() => load(query)}
          className="text-xs text-slate-500 hover:text-slate-300 transition"
          title="Recargar"
        >
          ↺
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && users.length === 0 ? (
          <div className="p-4 text-slate-500 text-sm">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-slate-500 text-sm">
            {query.trim() ? "Ningún usuario coincide." : "No hay otros usuarios registrados."}
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800 group"
              >
                {/* Indicador online */}
                <span className={`shrink-0 w-2 h-2 rounded-full ${u.isOnline ? "bg-green-400" : "bg-slate-600"}`} />

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{u.displayName}</div>
                  <div className="text-xs text-slate-500">{u.isOnline ? "En línea" : "Desconectado"}</div>
                </div>

                <button
                  onClick={() => handleDm(u.id)}
                  disabled={starting === u.id}
                  title="Iniciar chat directo"
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition"
                >
                  {starting === u.id ? "…" : "DM"}
                </button>
              </div>
            ))}
            {nextCursor && (
              <button
                onClick={() => load(query, nextCursor)}
                disabled={loading}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50 transition"
              >
                {loading ? "Cargando…" : "Cargar más"}
              </button>
            )}
          </div>
        )}
      </div>

      {me && (
        <div className="p-4 border-t border-slate-700 text-sm space-y-0.5">
          <div className="text-slate-100 font-medium">{me.displayName} <span className="text-green-400 text-xs">● tú</span></div>
          <div className="text-slate-500 text-xs">{me.email}</div>
        </div>
      )}
    </div>
  );
}
