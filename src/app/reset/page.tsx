"use client";

import { Suspense } from "react";
import { ResetPasswordForm } from "@/ui/components/email-flows";
import { FullScreenMessage } from "@/ui/components/session-gate";

// useSearchParams needs a Suspense boundary for the page to prerender.
export default function ResetPage() {
  return (
    <Suspense fallback={<FullScreenMessage>Cargando…</FullScreenMessage>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
