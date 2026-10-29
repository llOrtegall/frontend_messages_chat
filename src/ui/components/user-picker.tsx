"use client";

import { useState } from "react";
import { useUserSearch } from "../../hooks/useUserSearch.ts";
import { messageFor } from "../../i18n/errorMessages.ts";
import type { User } from "../../modules/user/domain/User.ts";
import type { UserId } from "../../modules/user/domain/UserId.ts";

const input =
  "w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

export function UserPicker({ onPick, exclude }: { onPick: (user: User) => void; exclude: readonly UserId[] }) {
  const [query, setQuery] = useState("");
  const { found, isLoading, failure } = useUserSearch(query);
  const candidates = found.excluding(exclude);
  return (
    <div>
      <input className={input} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o email exacto" aria-label="Buscar usuario" autoFocus />
      {failure !== null && <p role="alert" className="mt-1 text-xs text-red-400">{messageFor(failure, "users.search")}</p>}
      <ul className="mt-2 max-h-44 overflow-y-auto space-y-0.5">
        {isLoading && candidates.isEmpty() ? (
          <li className="text-xs text-slate-400 px-2 py-1">Buscando…</li>
        ) : candidates.isEmpty() ? (
          <li className="text-xs text-slate-400 px-2 py-1">Sin resultados</li>
        ) : (
          candidates.map((user) => (
            <li key={user.getId().toPrimitive()}>
              <button type="button" onClick={() => onPick(user)} className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-700 text-sm text-slate-200">
                {user.getDisplayName().toPrimitive()}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
