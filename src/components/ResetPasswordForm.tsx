"use client";

import { useState } from "react";
import Link from "next/link";
import { useEmailedToken } from "../hooks/useEmailedToken.ts";
import { useSession } from "../hooks/useSession.ts";
import { messageFor } from "../i18n/errorMessages.ts";
import { AuthCard } from "./AuthCard.tsx";
import { inputClass, primaryButtonClass } from "./formStyles.ts";
import { Notice } from "./Notice.tsx";

export const ResetPasswordForm = () => {
  const { resetPassword } = useSession();
  const token = useEmailedToken();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmation) return setError("Las contraseñas no coinciden");
    setState("saving");
    setError("");
    try {
      await resetPassword(token, password);
      setState("done");
    } catch (failure) {
      setError(messageFor(failure, "password.reset"));
      setState("idle");
    }
  };

  return (
    <AuthCard title="Nueva contraseña">
      {!token ? (
        <Notice kind="error">Falta el token. Abre el enlace completo del email.</Notice>
      ) : state === "done" ? (
        <Notice kind="ok">Contraseña cambiada. Se han cerrado todas tus sesiones; inicia sesión de nuevo.</Notice>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="space-y-5">
          {error && <Notice kind="error">{error}</Notice>}
          <label className="block text-sm font-medium text-slate-300">
            Nueva contraseña (mín. 8 caracteres)
            <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Repite la contraseña
            <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
          </label>
          <button type="submit" disabled={state === "saving"} className={primaryButtonClass}>
            {state === "saving" ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-400 hover:underline">Iniciar sesión</Link>
      </p>
    </AuthCard>
  );
};
