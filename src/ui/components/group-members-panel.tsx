"use client";

import { useState } from "react";
import type { RoomMember, RoomWithMembers } from "../../domain/entities.ts";
import { canAddMembers, canChangeRole, canLeave, canRemoveMember } from "../../domain/rules.ts";
import { useChat, useSession } from "../providers.tsx";
import { UserPicker } from "./user-picker.tsx";

const ROLE_LABEL: Record<RoomMember["role"], string> = { owner: "propietario", admin: "admin", member: "miembro" };

const action = "text-xs px-2 py-0.5 rounded hover:bg-slate-700 disabled:opacity-50";

export function GroupMembersPanel({ room, onClose }: { room: RoomWithMembers; onClose: () => void }) {
  const { store, presence } = useChat();
  const { user } = useSession();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  const leave = () => {
    if (confirm(`¿Salir del grupo "${room.name}"?`)) void run(() => store.leaveGroup(room.id));
  };

  return (
    <aside aria-labelledby="members-title" className="w-72 border-l border-slate-700 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 id="members-title" className="font-semibold text-sm">
          Miembros ({room.members.length})
        </h3>
        <button onClick={onClose} aria-label="Cerrar miembros" className="text-slate-400 hover:text-slate-100">
          ✕
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto p-2 space-y-1">
        {room.members.map((m) => (
          <li key={m.userId} className="px-2 py-1.5 rounded hover:bg-slate-800">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full ${presence[m.userId] ? "bg-green-500" : "bg-slate-600"}`}
                aria-label={presence[m.userId] ? "en línea" : "desconectado"}
              />
              <span className="flex-1 truncate">
                {m.displayName}
                {m.userId === user.id && <span className="text-slate-500"> (tú)</span>}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">{ROLE_LABEL[m.role]}</span>
            </div>
            {(canChangeRole(room, user, m) || canRemoveMember(room, user, m)) && (
              <div className="flex gap-1 mt-1 pl-4">
                {canChangeRole(room, user, m) && (
                  <button
                    disabled={busy}
                    className={`${action} text-slate-300`}
                    onClick={() => void run(() => store.setMemberRole(room.id, m.userId, m.role === "admin" ? "member" : "admin"))}
                  >
                    {m.role === "admin" ? "Quitar admin" : "Hacer admin"}
                  </button>
                )}
                {canRemoveMember(room, user, m) && (
                  <button
                    disabled={busy}
                    className={`${action} text-red-400`}
                    aria-label={`Quitar a ${m.displayName} del grupo`}
                    onClick={() => void run(() => store.removeMember(room.id, m.userId))}
                  >
                    Quitar
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="p-3 border-t border-slate-700 space-y-2">
        {canAddMembers(room, user) &&
          (adding ? (
            <div className="space-y-2">
              <UserPicker
                exclude={new Set(room.members.map((m) => m.userId))}
                onPick={(u) => void run(async () => (await store.addMember(room.id, u.id)) && (setAdding(false), true))}
              />
              <button onClick={() => setAdding(false)} className="text-xs text-slate-400 hover:text-slate-200">
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
              + Añadir miembro
            </button>
          ))}
        {canLeave(room, user) && (
          <button onClick={leave} disabled={busy} className="w-full py-1.5 bg-slate-800 hover:bg-red-900/60 text-red-400 rounded-lg text-sm">
            Salir del grupo
          </button>
        )}
      </div>
    </aside>
  );
}
