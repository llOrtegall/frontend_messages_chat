"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/** Reads the emailed token once and removes it from the address bar (history, screenshots). */
export const useEmailedToken = (): string | null => {
  const params = useSearchParams();
  const [token] = useState(() => params.get("token"));
  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);
  return token;
};
