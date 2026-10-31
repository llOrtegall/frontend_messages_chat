"use client";

import { useState } from "react";
import { useSession } from "../hooks/useSession.ts";

/** Shown in the chat while the email is unverified. */
export const VerifyEmailBanner = () => {
  const { user, requestEmailVerification } = useSession();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (!user || user.isEmailVerified()) return null;

  const resend = async () => {
    setState("sending");
    try {
      await requestEmailVerification();
      setState("sent");
    } catch {
      // The button turns into "Reintentar"; nothing else depends on it.
      setState("error");
    }
  };

  return (
    <div role="status" className="px-4 py-2 bg-amber-900/40 border-b border-amber-700 text-amber-200 text-sm flex items-center gap-3">
      <span className="flex-1">Verifica tu email ({user.getEmail().toPrimitive()}) con el enlace que te enviamos.</span>
      {state === "sent" ? (
        <span>Enlace reenviado.</span>
      ) : (
        <button onClick={() => void resend()} disabled={state === "sending"} className="underline hover:text-amber-100 disabled:opacity-50">
          {state === "error" ? "Reintentar" : "Reenviar enlace"}
        </button>
      )}
    </div>
  );
};
