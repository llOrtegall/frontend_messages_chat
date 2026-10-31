"use client";

import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { FullScreenMessage } from "@/components/FullScreenMessage";

// useSearchParams needs a Suspense boundary for the page to prerender.
export default function ResetPage() {
  return (
    <Suspense fallback={<FullScreenMessage>Cargando…</FullScreenMessage>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
