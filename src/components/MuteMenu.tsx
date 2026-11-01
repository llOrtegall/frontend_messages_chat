import { useState } from "react";
import { MuteDuration, type MuteDurationPrimitive } from "../modules/room/domain/MuteDuration.ts";

const DURATION_LABEL: Readonly<Record<MuteDurationPrimitive, string>> = {
  hour: "1 hora",
  eight_hours: "8 horas",
  week: "1 semana",
  until_unmuted: "Hasta que la reactive",
};

const formatEnd = (at: Date) => at.toLocaleString("es-ES", { weekday: "short", hour: "2-digit", minute: "2-digit" });

interface MuteMenuProps {
  /** When the current mute ends; null when the room isn't muted. */
  readonly mutedUntil: Date | null;
  readonly onMute: (duration: MuteDurationPrimitive) => void;
  readonly onUnmute: () => void;
}

export const MuteMenu = ({ mutedUntil, onMute, onUnmute }: MuteMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const choose = (action: () => void) => {
    setIsOpen(false);
    action();
  };
  const state = mutedUntil === null ? null : MuteDuration.isIndefinite(mutedUntil, new Date()) ? "Silenciada" : `Silenciada hasta ${formatEnd(mutedUntil)}`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={state ?? "Silenciar conversación"}
        title={state ?? "Silenciar conversación"}
        className="text-slate-400 hover:text-slate-100 transition text-sm px-1.5 py-0.5 rounded hover:bg-slate-800"
      >
        <span aria-hidden>{mutedUntil ? "🔕" : "🔔"}</span>
      </button>
      {isOpen && (
        <div role="menu" aria-label="Silenciar" className="absolute right-0 mt-1 w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-10">
          {mutedUntil && (
            <button role="menuitem" onClick={() => choose(onUnmute)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700">
              Reactivar avisos
            </button>
          )}
          {MuteDuration.all().map((duration) => {
            const value = duration.toPrimitive();
            return (
              <button key={value} role="menuitem" onClick={() => choose(() => onMute(value))} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700">
                Silenciar {DURATION_LABEL[value].toLowerCase()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
