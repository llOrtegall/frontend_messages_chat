"use client";

import { useActiveSessions } from "../hooks/useActiveSessions.ts";
import { messageFor } from "../i18n/errorMessages.ts";
import { ActiveSessionItem } from "./ActiveSessionItem.tsx";
import { ChangePasswordForm } from "./ChangePasswordForm.tsx";
import { Modal } from "./Modal.tsx";
import { Notice } from "./Notice.tsx";

export function SecurityDialog({ onClose }: { onClose: () => void }) {
  const { sessions, isLoading, failure, reload, end } = useActiveSessions();

  return (
    <Modal labelledBy="security-title" onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 id="security-title" className="text-lg font-semibold">Seguridad</h2>
        <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-100">✕</button>
      </div>

      <section aria-labelledby="password-title" className="space-y-3">
        <h3 id="password-title" className="text-sm font-semibold text-slate-200">Cambiar contraseña</h3>
        <ChangePasswordForm onChanged={() => void reload()} />
      </section>

      <section aria-labelledby="sessions-title" className="mt-6">
        <h3 id="sessions-title" className="text-sm font-semibold text-slate-200">Sesiones activas</h3>
        {failure && <Notice kind="error">{messageFor(failure.cause, failure.action)}</Notice>}
        {isLoading && sessions.isEmpty() ? (
          <p role="status" className="text-sm text-slate-400 py-2">Cargando sesiones…</p>
        ) : (
          <ul className="divide-y divide-slate-700">
            {sessions.map((session) => (
              <ActiveSessionItem key={session.getId().toPrimitive()} session={session} onEnd={() => void end(session.getId().toPrimitive())} />
            ))}
          </ul>
        )}
      </section>
    </Modal>
  );
}
