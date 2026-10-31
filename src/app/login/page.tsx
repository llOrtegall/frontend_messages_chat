"use client";

import { AuthForm } from "@/components/AuthForm";
import { SessionGate } from "@/components/SessionGate";

export default function LoginPage() {
  return (
    <SessionGate require="anonymous">
      <div className="flex flex-1 items-center justify-center">
        <AuthForm mode="login" />
      </div>
    </SessionGate>
  );
}
