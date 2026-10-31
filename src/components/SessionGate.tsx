"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../hooks/useSession.ts";
import { FullScreenMessage } from "./FullScreenMessage.tsx";

/**
 * Client-side route guard. The refresh cookie belongs to the API origin, so the Next server
 * cannot see the session; the API still authorizes every request.
 */
export function SessionGate({ require, children }: { require: "authenticated" | "anonymous"; children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading" && status !== require) router.replace(require === "authenticated" ? "/login" : "/chat");
  }, [status, require, router]);

  return status === require ? children : <FullScreenMessage>Cargando…</FullScreenMessage>;
}
