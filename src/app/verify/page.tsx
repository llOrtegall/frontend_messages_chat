"use client";

import { Suspense } from "react";
import { VerifyEmail } from "@/components/VerifyEmail";
import { FullScreenMessage } from "@/components/FullScreenMessage";

// useSearchParams needs a Suspense boundary for the page to prerender.
export default function VerifyPage() {
  return (
    <Suspense fallback={<FullScreenMessage>Cargando…</FullScreenMessage>}>
      <VerifyEmail />
    </Suspense>
  );
}
