"use client";

import { useState } from "react";
import type { UserSummary } from "../../domain/entities.ts";
import { useUserSearch } from "../use-user-search.ts";

const input =
  "w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

export function UserPicker({ onPick, exclude }: { onPick: (u: UserSummary) => void; exclude: ReadonlySet<string> }) {
  const [query, setQuery] = useState("");
  const { users, loading } = useUserSearch(query);
  const candidates = users.filter((u) => !exclude.has(u.id));
  return (
    <div>
      <input className={input} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o email exacto" aria-label="Buscar usuario" autoFocus />
      <ul className="mt-2 max-h-44 overflow-y-auto space-y-0.5">
        {loading && candidates.length === 0 ? (
          <li className="text-xs text-slate-400 px-2 py-1">Buscando…</li>
        ) : candidates.length === 0 ? (
          <li className="text-xs text-slate-400 px-2 py-1">Sin resultados</li>
        ) : (
          candidates.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => onPick(u)} className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-700 text-sm text-slate-200">
                {u.displayName}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

