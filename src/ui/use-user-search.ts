"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserListItem } from "../domain/entities.ts";
import { useContainer } from "./providers.tsx";

const DEBOUNCE_MS = 300;

/** Debounced, paginated user search (name substring or exact email). */
export function useUserSearch(query: string) {
  const { users: directory } = useContainer();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (q: string, cursor?: string) => {
      setLoading(true);
      try {
        const page = await directory.search({ query: q, cursor });
        setUsers((prev) => (cursor ? [...prev, ...page.users] : page.users));
        setNextCursor(page.nextCursor);
      } catch {
        // keep the previous results; the list simply doesn't update
      } finally {
        setLoading(false);
      }
    },
    [directory],
  );

  useEffect(() => {
    const id = setTimeout(() => void load(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, load]);

  return {
    users,
    loading,
    hasMore: nextCursor !== null,
    loadMore: () => (nextCursor ? load(query, nextCursor) : undefined),
    reload: () => load(query),
  };
}
