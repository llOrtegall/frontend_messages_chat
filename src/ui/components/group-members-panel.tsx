"use client";

import { useState } from "react";
import { useChat } from "../../hooks/useChat.ts";
import { useSession } from "../../hooks/useSession.ts";
import type { MemberRolePrimitive } from "../../modules/room/domain/MemberRole.ts";
import type { Room } from "../../modules/room/domain/Room.ts";
import { Avatar } from "./avatar.tsx";
import { UserPicker } from "./user-picker.tsx";

const ROLE_LABEL: Record<MemberRolePrimitive, string> = { owner: "propietario", admin: "admin", member: "miembro" };

const action = "text-xs px-2 py-0.5 rounded hover:bg-slate-700 disabled:opacity-50";

export function GroupMembersPanel({ room, onClose }: { room: Room; onClose: () => void }) {
  const { chat, session } = useChat();
  const me = useSession().user?.getId() ?? null;
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  const roomId = room.getId().toPrimitive();
  const members = room.getMembers();

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  const leave = () => {
    if (confirm(`¿Salir del grupo "${room.getName()?.toPrimitive() ?? ""}"?`)) void run(() => session.leaveGroup(roomId));
  };

  return (
    <aside aria-labelledby="members-title" className="w-72 border-l border-slate-700 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 id="members-title" className="font-semibold text-sm">
          Miembros ({members.count()})
        </h3>
        <button onClick={onClose} aria-label="Cerrar miembros" className="text-slate-400 hover:text-slate-100">
          ✕
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto p-2 space-y-1">
        {members.map((member) => {
          const userId = member.getUserId();
          const name = member.getDisplayName().toPrimitive();
          const role = member.getRole();
          const isOnline = chat.isOnline(userId, false);
          const canChangeRole = room.canChangeRoleOf(member, me);
          const canRemove = room.canRemove(member, me);
          return (
            <li key={userId.toPrimitive()} className="px-2 py-1.5 rounded hover:bg-slate-800">
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-slate-600"}`} aria-hidden />
                <span className="sr-only">{isOnline ? "En línea:" : "Desconectado:"}</span>
                <Avatar name={name} url={member.getAvatarUrl()?.toPrimitive() ?? null} size="sm" />
                <span className="flex-1 truncate">
                  {name}
                  {member.is(me) && <span className="text-slate-400"> (tú)</span>}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">{ROLE_LABEL[role.toPrimitive()]}</span>
              </div>
              {(canChangeRole || canRemove) && (
                <div className="flex gap-1 mt-1 pl-4">
                  {canChangeRole && (
                    <button
                      disabled={busy}
                      className={`${action} text-slate-300`}
                      onClick={() => void run(() => session.changeMemberRole(roomId, userId.toPrimitive(), role.toggled().toPrimitive()))}
                    >
                      {role.isAdmin() ? "Quitar admin" : "Hacer admin"}
                    </button>
                  )}
                  {canRemove && (
                    <button
                      disabled={busy}
                      className={`${action} text-red-400`}
                      aria-label={`Quitar a ${name} del grupo`}
                      onClick={() => void run(() => session.removeMember(roomId, userId.toPrimitive()))}
                    >
                      Quitar
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="p-3 border-t border-slate-700 space-y-2">
        {room.canAddMembers(me) &&
          (adding ? (
            <div className="space-y-2">
              <UserPicker
                exclude={members.userIds()}
                onPick={(picked) => void run(async () => (await session.addMember(roomId, picked.getId().toPrimitive())) && (setAdding(false), true))}
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
        {room.canLeave(me) && (
          <button onClick={leave} disabled={busy} className="w-full py-1.5 bg-slate-800 hover:bg-red-900/60 text-red-400 rounded-lg text-sm">
            Salir del grupo
          </button>
        )}
      </div>
    </aside>
  );
}
