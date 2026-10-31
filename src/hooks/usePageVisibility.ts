"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

/** Whether the tab is in view (false when it is in the background or the window is minimised). */
export const usePageVisibility = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "visible",
    () => true,
  );
