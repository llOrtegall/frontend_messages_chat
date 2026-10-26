"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "../providers.tsx";
import { errorMessage } from "../../application/store.ts";

const input =
  "w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

/** Login or registration. On success the session changes and <SessionGate> redirects to /chat. */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { store } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isLogin) await store.login(email, password);
      else await store.register(email, password, displayName);
    } catch (err) {
      setError(errorMessage(err, isLogin ? "No se pudo iniciar sesión" : "No se pudo crear la cuenta"));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-5 px-4">
      <h1 className="text-2xl font-bold text-center">{isLogin ? "Iniciar sesión" : "Crear cuenta"}</h1>

      {error && (
        <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {!isLogin && (
        <label className="block text-sm font-medium text-slate-300">
          Nombre visible
          <input className={`${input} mt-1`} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={64} />
        </label>
      )}

      <label className="block text-sm font-medium text-slate-300">
        Email
        <input className={`${input} mt-1`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      <label className="block text-sm font-medium text-slate-300">
        Contraseña{!isLogin && " (mín. 8 caracteres)"}
        <input
          className={`${input} mt-1`}
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={isLogin ? undefined : 8}
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-2 rounded-lg transition"
      >
        {submitting ? "Enviando…" : isLogin ? "Entrar" : "Registrarme"}
      </button>

      {isLogin && (
        <p className="text-center text-sm">
          <Link href="/forgot" className="text-slate-400 hover:text-slate-200 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      )}

      <p className="text-center text-sm text-slate-400">
        {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
        <Link href={isLogin ? "/register" : "/login"} className="text-blue-400 hover:underline">
          {isLogin ? "Regístrate" : "Inicia sesión"}
        </Link>
      </p>
    </form>
  );
}
