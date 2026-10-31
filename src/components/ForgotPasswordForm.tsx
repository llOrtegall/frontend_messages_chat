"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "../hooks/useSession.ts";
import { messageFor } from "../i18n/errorMessages.ts";
import { AuthCard } from "./AuthCard.tsx";
import { inputClass, primaryButtonClass } from "./formStyles.ts";
import { Notice } from "./Notice.tsx";

export const ForgotPasswordForm = () => {
  const { requestPasswordReset } = useSession();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      await requestPasswordReset(email);
      setState("sent");
    } catch (failure) {
      setError(messageFor(failure, "email.request_reset"));
      setState("idle");
    }
  };

  return (
    <AuthCard title="Recuperar contraseña">
      {state === "sent" ? (
        // Same answer whether or not the account exists (no account enumeration).
        <Notice kind="ok">Si hay una cuenta con ese email, te hemos enviado un enlace para elegir otra contraseña.</Notice>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="space-y-5">
          {error && <Notice kind="error">{error}</Notice>}
          <label className="block text-sm font-medium text-slate-300">
            Email
            <input className={`${inputClass} mt-1`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" disabled={state === "sending"} className={primaryButtonClass}>
            {state === "sending" ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-400 hover:underline">Volver a iniciar sesión</Link>
      </p>
    </AuthCard>
  );
};
