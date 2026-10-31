import type { User } from "../modules/user/domain/User.ts";
import { Avatar } from "./Avatar.tsx";

interface UserItemProps {
  readonly user: User;
  readonly isOnline: boolean;
  readonly isOpening: boolean;
  readonly onOpen: () => void;
}

export const UserItem = ({ user, isOnline, isOpening, onOpen }: UserItemProps) => {
  const name = user.getDisplayName().toPrimitive();
  return (
    <button
      onClick={onOpen}
      disabled={isOpening}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-left disabled:opacity-60"
      title="Abrir mensaje directo"
    >
      <Avatar name={name} url={user.getAvatarUrl()?.toPrimitive() ?? null} />
      <span className={`shrink-0 w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-slate-600"}`} aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-slate-200 truncate">{name}</span>
        <span className="block text-xs text-slate-400">{isOnline ? "En línea" : "Desconectado"}</span>
      </span>
      <span className="shrink-0 text-xs text-blue-400">{isOpening ? "…" : "DM"}</span>
    </button>
  );
};
