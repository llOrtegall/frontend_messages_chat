"use client";

import { useState } from "react";
import { UserList } from "../../modules/user/domain/UserList.ts";
import { messageFor } from "../../i18n/errorMessages.ts";
import { useChat } from "../providers.tsx";
import { Modal } from "./modal.tsx";
import { UserPicker } from "./user-picker.tsx";

const input =
  "w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

export function NewConversationModal({ onClose }: { onClose: () => void }) {
  const { store } = useChat();
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState(UserList.empty());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      onClose();
    } catch (err) {
      setError(messageFor(err, "room.create"));
      setBusy(false);
    }
  };

  return (
    <Modal labelledBy="new-conv-title" onClose={onClose}>
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
        <UserPicker exclude={[]} onPick={(user) => void run(() => store.openDirect(user.getId().toPrimitive()))} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => store.createGroup(groupName, members.map((member) => member.getId().toPrimitive())));
          }}
        >
          <label className="block text-sm font-medium text-slate-300">
            Nombre del grupo
            <input className={`${input} mt-1`} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ej: Equipo backend" maxLength={128} required />
          </label>
          {!members.isEmpty() && (
            <ul className="flex flex-wrap gap-1">
              {members.map((member) => (
                <li key={member.getId().toPrimitive()} className="flex items-center gap-1 bg-slate-900 rounded-full pl-2 pr-1 py-0.5 text-xs text-slate-300">
                  {member.getDisplayName().toPrimitive()}
                  <button type="button" onClick={() => setMembers((current) => current.excluding([member.getId()]))} className="text-slate-400 hover:text-red-400 px-1" aria-label={`Quitar a ${member.getDisplayName().toPrimitive()}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="text-sm font-medium text-slate-300">Añadir miembros (opcional)</div>
          <UserPicker exclude={members.map((member) => member.getId())} onPick={(user) => setMembers((current) => current.append(UserList.create([user])))} />
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
    </Modal>
  );
}
