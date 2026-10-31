"use client";

import { useState } from "react";
import { useChat } from "../hooks/useChat.ts";
import { useSession } from "../hooks/useSession.ts";
import type { Room } from "../modules/room/domain/Room.ts";
import { MemberItem } from "./MemberItem.tsx";
import { UserPicker } from "./UserPicker.tsx";

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
        {members.map((member) => (
          <li key={member.getUserId().toPrimitive()} className="px-2 py-1.5 rounded hover:bg-slate-800">
            <MemberItem
              member={member}
              isMe={member.is(me)}
              isOnline={chat.isOnline(member.getUserId(), false)}
              canChangeRole={room.canChangeRoleOf(member, me)}
              canRemove={room.canRemove(member, me)}
              isBusy={busy}
              onToggleAdmin={() => void run(() => session.changeMemberRole(roomId, member.getUserId().toPrimitive(), member.getRole().toggled().toPrimitive()))}
              onRemove={() => void run(() => session.removeMember(roomId, member.getUserId().toPrimitive()))}
            />
          </li>
        ))}
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
