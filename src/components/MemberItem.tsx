import type { MemberRolePrimitive } from "../modules/room/domain/MemberRole.ts";
import type { RoomMember } from "../modules/room/domain/RoomMember.ts";
import { Avatar } from "./Avatar.tsx";

const ROLE_LABEL: Record<MemberRolePrimitive, string> = { owner: "propietario", admin: "admin", member: "miembro" };
const ACTION = "text-xs px-2 py-0.5 rounded hover:bg-slate-700 disabled:opacity-50";

interface MemberItemProps {
  readonly member: RoomMember;
  readonly isMe: boolean;
  readonly isOnline: boolean;
  readonly canChangeRole: boolean;
  readonly canRemove: boolean;
  readonly isBusy: boolean;
  readonly onToggleAdmin: () => void;
  readonly onRemove: () => void;
}

export const MemberItem = ({ member, isMe, isOnline, canChangeRole, canRemove, isBusy, onToggleAdmin, onRemove }: MemberItemProps) => {
  const name = member.getDisplayName().toPrimitive();
  const role = member.getRole();
  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-slate-600"}`} aria-hidden />
        <span className="sr-only">{isOnline ? "En línea:" : "Desconectado:"}</span>
        <Avatar name={name} url={member.getAvatarUrl()?.toPrimitive() ?? null} size="sm" />
        <span className="flex-1 truncate">
          {name}
          {isMe && <span className="text-slate-400"> (tú)</span>}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{ROLE_LABEL[role.toPrimitive()]}</span>
      </div>
      {(canChangeRole || canRemove) && (
        <div className="flex gap-1 mt-1 pl-4">
          {canChangeRole && (
            <button disabled={isBusy} className={`${ACTION} text-slate-300`} onClick={onToggleAdmin}>
              {role.isAdmin() ? "Quitar admin" : "Hacer admin"}
            </button>
          )}
          {canRemove && (
            <button disabled={isBusy} className={`${ACTION} text-red-400`} aria-label={`Quitar a ${name} del grupo`} onClick={onRemove}>
              Quitar
            </button>
          )}
        </div>
      )}
    </>
  );
};
