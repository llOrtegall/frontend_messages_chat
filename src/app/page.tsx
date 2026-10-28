"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { FullScreenMessage } from "@/ui/components/session-gate";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading") router.replace(status === "authenticated" ? "/chat" : "/login");
  }, [status, router]);

  return <FullScreenMessage>Cargando…</FullScreenMessage>;
}
