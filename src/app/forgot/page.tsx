"use client";

import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { FullScreenMessage } from "@/components/FullScreenMessage";

// useSearchParams needs a Suspense boundary for the page to prerender.
export default function ForgotPage() {
  return (
    <Suspense fallback={<FullScreenMessage>Cargando…</FullScreenMessage>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
