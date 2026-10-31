"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useEmailedToken } from "../hooks/useEmailedToken.ts";
import { useSession } from "../hooks/useSession.ts";
import { messageFor } from "../i18n/errorMessages.ts";
import { AuthCard } from "./AuthCard.tsx";
import { Notice } from "./Notice.tsx";

export const VerifyEmail = () => {
  const { confirmEmailVerification, status } = useSession();
  const token = useEmailedToken();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  // The token can be redeemed once, and StrictMode runs effects twice.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current || status === "loading") return;
    started.current = true;
    confirmEmailVerification(token).then(
      () => setResult({ ok: true, message: "Tu email está verificado." }),
      (error) => setResult({ ok: false, message: messageFor(error, "email.verify") }),
    );
  }, [token, status, confirmEmailVerification]);

  const next = status === "authenticated" ? { href: "/chat", label: "Ir al chat" } : { href: "/login", label: "Iniciar sesión" };
  return (
    <AuthCard title="Verificar email">
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
    </AuthCard>
  );
};
