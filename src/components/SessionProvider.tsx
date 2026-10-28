"use client";

import { SessionContext, useSessionState } from "../hooks/useSession.ts";

export const SessionProvider = ({ children }: { readonly children: React.ReactNode }) => (
  <SessionContext.Provider value={useSessionState()}>{children}</SessionContext.Provider>
);
