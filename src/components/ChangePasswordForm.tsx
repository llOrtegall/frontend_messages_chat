"use client";

import { useState } from "react";
import { useSession } from "../hooks/useSession.ts";
import { messageFor } from "../i18n/errorMessages.ts";
import { inputClass, primaryButtonClass } from "./formStyles.ts";
import { Notice } from "./Notice.tsx";

export const ChangePasswordForm = ({ onChanged }: { readonly onChanged: () => void }) => {
  const { changePassword } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmation) return setError("Las contraseñas no coinciden");
    setState("saving");
    setError("");
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setState("done");
      onChanged();
    } catch (failure) {
      setError(messageFor(failure, "password.change"));
      setState("idle");
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      {error && <Notice kind="error">{error}</Notice>}
      {state === "done" && <Notice kind="ok">Contraseña cambiada. Se han cerrado tus otras sesiones.</Notice>}
      <label className="block text-sm font-medium text-slate-300">
        Contraseña actual
        <input className={`${inputClass} mt-1`} type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Nueva contraseña (mín. 8 caracteres)
        <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Repite la nueva contraseña
        <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
      </label>
      <button type="submit" disabled={state === "saving"} className={primaryButtonClass}>
        {state === "saving" ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
};
