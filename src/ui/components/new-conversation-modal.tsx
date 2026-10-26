"use client";

import { useState } from "react";
import type { UserSummary } from "../../domain/entities.ts";
import { errorMessage } from "../../application/store.ts";
import { useChat } from "../providers.tsx";
import { UserPicker } from "./user-picker.tsx";

const input =
  "w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

export function NewConversationModal({ onClose }: { onClose: () => void }) {
  const { store } = useChat();
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      onClose();
    } catch (err) {
      setError(errorMessage(err, "No se pudo crear la conversación"));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="new-conv-title" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 id="new-conv-title" className="text-lg font-bold text-slate-100 mb-4">Nueva conversación</h2>

        <div className="flex mb-5 bg-slate-900 rounded-lg p-1 gap-1" role="tablist">
          {(["dm", "group"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              {t === "dm" ? "Mensaje directo" : "Grupo"}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 text-sm p-3 rounded-lg mb-4">{error}</div>}

        {tab === "dm" ? (
          <UserPicker exclude={new Set()} onPick={(u) => void run(() => store.openDirect(u.id))} />
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => store.createGroup(groupName, members.map((m) => m.id)));
            }}
          >
            <label className="block text-sm font-medium text-slate-300">
              Nombre del grupo
              <input className={`${input} mt-1`} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ej: Equipo backend" maxLength={128} required />
            </label>
            {members.length > 0 && (
              <ul className="flex flex-wrap gap-1">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-1 bg-slate-900 rounded-full pl-2 pr-1 py-0.5 text-xs text-slate-300">
                    {m.displayName}
                    <button type="button" onClick={() => setMembers((prev) => prev.filter((x) => x.id !== m.id))} className="text-slate-500 hover:text-red-400 px-1" aria-label={`Quitar a ${m.displayName}`}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-sm font-medium text-slate-300">Añadir miembros (opcional)</div>
            <UserPicker exclude={new Set(members.map((m) => m.id))} onPick={(u) => setMembers((prev) => [...prev, u])} />
            <button type="submit" disabled={!groupName.trim() || busy} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg text-sm font-medium">
              {busy ? "Creando…" : "Crear grupo"}
            </button>
          </form>
        )}

        <div className="flex justify-end pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg text-sm">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
