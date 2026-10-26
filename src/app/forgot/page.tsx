"use client";

import { Suspense } from "react";
import { ForgotPasswordForm } from "@/ui/components/email-flows";
import { FullScreenMessage } from "@/ui/components/session-gate";

// useSearchParams needs a Suspense boundary for the page to prerender.
export default function ForgotPage() {
  return (
    <Suspense fallback={<FullScreenMessage>Cargando…</FullScreenMessage>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
