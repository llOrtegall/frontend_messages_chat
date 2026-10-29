"use client";

import { useCallback, useEffect, useState } from "react";
import { users } from "../modules/user/application/factory.ts";
import type { UserSearchCursor } from "../modules/user/domain/UserSearchCursor.ts";
import { UserList } from "../modules/user/domain/UserList.ts";

const DEBOUNCE_MS = 300;

/** Debounced, paginated search of other users (part of a name, or an exact email). */
export const useUserSearch = (query: string) => {
  const [found, setFound] = useState(UserList.empty());
  const [nextCursor, setNextCursor] = useState<UserSearchCursor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<unknown>(null);

  const load = useCallback(async (search: string, cursor: UserSearchCursor | null) => {
    setIsLoading(true);
    try {
      const page = await users.searchUsers({ query: search, cursor: cursor?.toPrimitive() ?? null });
      setFound((current) => (cursor ? current.append(page.getUsers()) : page.getUsers()));
      setNextCursor(page.getNextCursor());
      setFailure(null);
    } catch (error) {
      // The last results stay on screen next to the error.
      setFailure(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(query, null), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, load]);

  return {
    found,
    isLoading,
    failure,
    hasMore: nextCursor !== null,
    loadMore: () => (nextCursor ? load(query, nextCursor) : undefined),
    reload: () => load(query, null),
  };
};
