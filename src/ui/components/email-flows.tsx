"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { errorMessage } from "../../application/store.ts";
import { useSession } from "../providers.tsx";

const input =
  "w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
const button = "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-2 rounded-lg transition";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm mx-auto space-y-5 px-4">
        <h1 className="text-2xl font-bold text-center">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Notice({ kind, children }: { kind: "error" | "ok"; children: React.ReactNode }) {
  const style = kind === "error" ? "bg-red-900/40 border-red-700 text-red-300" : "bg-green-900/40 border-green-700 text-green-300";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`border text-sm p-3 rounded-lg ${style}`}>
      {children}
    </div>
  );
}

/** Reads the emailed token once and removes it from the address bar (history, screenshots). */
function useEmailedToken(): string | null {
  const params = useSearchParams();
  const [token] = useState(() => params.get("token"));
  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);
  return token;
}

export function VerifyEmail() {
  const { store, status } = useSession();
  const token = useEmailedToken();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current || status === "loading") return;
    started.current = true;
    store.verifyEmail(token).then(
      () => setResult({ ok: true, message: "Tu email está verificado." }),
      (err) => setResult({ ok: false, message: errorMessage(err, "El enlace no es válido o ha caducado.") }),
    );
  }, [token, status, store]);

  const next = status === "authenticated" ? { href: "/chat", label: "Ir al chat" } : { href: "/login", label: "Iniciar sesión" };
  return (
    <Card title="Verificar email">
      {!token ? (
        <Notice kind="error">Falta el token. Abre el enlace completo del email.</Notice>
      ) : !result ? (
        <p className="text-center text-slate-400" role="status">Verificando…</p>
      ) : (
        <Notice kind={result.ok ? "ok" : "error"}>{result.message}</Notice>
      )}
      <p className="text-center text-sm">
        <Link href={next.href} className="text-blue-400 hover:underline">{next.label}</Link>
      </p>
    </Card>
  );
}

export function ForgotPasswordForm() {
  const { store } = useSession();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      await store.requestPasswordReset(email);
      setState("sent");
    } catch (err) {
      setError(errorMessage(err, "No se pudo enviar el enlace"));
      setState("idle");
    }
  };

  return (
    <Card title="Recuperar contraseña">
      {state === "sent" ? (
        // Same answer whether or not the account exists (no account enumeration).
        <Notice kind="ok">Si hay una cuenta con ese email, te hemos enviado un enlace para elegir otra contraseña.</Notice>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="space-y-5">
          {error && <Notice kind="error">{error}</Notice>}
          <label className="block text-sm font-medium text-slate-300">
            Email
            <input className={`${input} mt-1`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" disabled={state === "sending"} className={button}>
            {state === "sending" ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-400 hover:underline">Volver a iniciar sesión</Link>
      </p>
    </Card>
  );
}

export function ResetPasswordForm() {
  const { store } = useSession();
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
      await store.resetPassword(token, password);
      setState("done");
    } catch (err) {
      setError(errorMessage(err, "No se pudo cambiar la contraseña"));
      setState("idle");
    }
  };

  return (
    <Card title="Nueva contraseña">
      {!token ? (
        <Notice kind="error">Falta el token. Abre el enlace completo del email.</Notice>
      ) : state === "done" ? (
        <Notice kind="ok">Contraseña cambiada. Se han cerrado todas tus sesiones; inicia sesión de nuevo.</Notice>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="space-y-5">
          {error && <Notice kind="error">{error}</Notice>}
          <label className="block text-sm font-medium text-slate-300">
            Nueva contraseña (mín. 8 caracteres)
            <input className={`${input} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Repite la contraseña
            <input className={`${input} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
          </label>
          <button type="submit" disabled={state === "saving"} className={button}>
            {state === "saving" ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-400 hover:underline">Iniciar sesión</Link>
      </p>
    </Card>
  );
}

/** Shown in the chat while the email is unverified. */
export function VerifyEmailBanner() {
  const { user, store } = useSession();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (!user || user.emailVerifiedAt) return null;

  const resend = async () => {
    setState("sending");
    try {
      await store.resendVerification();
      setState("sent");
    } catch {
      setState("error");
    }
  };

  return (
    <div role="status" className="px-4 py-2 bg-amber-900/40 border-b border-amber-700 text-amber-200 text-sm flex items-center gap-3">
      <span className="flex-1">Verifica tu email ({user.email}) con el enlace que te enviamos.</span>
      {state === "sent" ? (
        <span>Enlace reenviado.</span>
      ) : (
        <button onClick={() => void resend()} disabled={state === "sending"} className="underline hover:text-amber-100 disabled:opacity-50">
          {state === "error" ? "Reintentar" : "Reenviar enlace"}
        </button>
      )}
    </div>
  );
}
