"use client";

import { AuthForm } from "@/ui/components/auth-form";
import { SessionGate } from "@/ui/components/session-gate";

export default function LoginPage() {
  return (
    <SessionGate require="anonymous">
      <div className="flex flex-1 items-center justify-center">
        <AuthForm mode="login" />
      </div>
    </SessionGate>
  );
}
