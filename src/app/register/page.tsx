"use client";

import { AuthForm } from "@/components/AuthForm";
import { SessionGate } from "@/components/SessionGate";

export default function RegisterPage() {
  return (
    <SessionGate require="anonymous">
      <div className="flex flex-1 items-center justify-center">
        <AuthForm mode="register" />
      </div>
    </SessionGate>
  );
}
