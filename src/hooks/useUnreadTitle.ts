"use client";

import { useEffect } from "react";

/** Prefixes the tab title with the unread count, so it shows from other tabs. */
export const useUnreadTitle = (unreadCount: number): void => {
  useEffect(() => {
    const title = document.title;
    if (unreadCount > 0) document.title = `(${unreadCount}) ${title}`;
    return () => {
      document.title = title;
    };
  }, [unreadCount]);
};
