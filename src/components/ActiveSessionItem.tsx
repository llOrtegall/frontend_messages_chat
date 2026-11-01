import type { ActiveSession } from "../modules/session/domain/ActiveSession.ts";

const formatWhen = (at: Date) => at.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });

interface ActiveSessionItemProps {
  readonly session: ActiveSession;
  readonly onEnd: () => void;
}

export const ActiveSessionItem = ({ session, onEnd }: ActiveSessionItemProps) => {
  const browser = session.browserName() ?? "Navegador desconocido";
  const system = session.systemName();
  const device = system ? `${browser} en ${system}` : browser;
  const ip = session.getIp();

  return (
    <li className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {device}
          {session.isCurrent() && <span className="ml-2 text-xs text-green-400">Esta sesión</span>}
        </p>
        <p className="text-xs text-slate-400 truncate">
          {ip ? `${ip} · ` : ""}último uso {formatWhen(session.getLastUsedAt())}
        </p>
      </div>
      {session.canBeEndedFromHere() && (
        <button onClick={onEnd} aria-label={`Cerrar la sesión de ${device}`} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-red-900/60 hover:text-red-300">
          Cerrar
        </button>
      )}
    </li>
  );
};
