"use client";

import { useCallback, useEffect, useState } from "react";
import type { FailedAction } from "../i18n/errorMessages.ts";
import { session } from "../modules/session/application/factory.ts";
import { ActiveSessionId } from "../modules/session/domain/ActiveSessionId.ts";
import { ActiveSessionList } from "../modules/session/domain/ActiveSessionList.ts";

export interface ActiveSessionsFailure {
  readonly action: Extract<FailedAction, "sessions.load" | "session.end">;
  readonly cause: unknown;
}

/** The devices the user is signed in with, while the security dialog is open. */
export const useActiveSessions = () => {
  const [sessions, setSessions] = useState(ActiveSessionList.empty());
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<ActiveSessionsFailure | null>(null);

  const show = useCallback((loaded: ActiveSessionList) => {
    setSessions(loaded);
    setFailure(null);
  }, []);
  const failLoading = useCallback((cause: unknown) => setFailure({ action: "sessions.load", cause }), []);

  useEffect(() => {
    let isCurrent = true;
    session
      .listActiveSessions()
      .then((loaded) => isCurrent && show(loaded))
      .catch((cause: unknown) => isCurrent && failLoading(cause))
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [show, failLoading]);

  const reload = useCallback(async () => {
    try {
      show(await session.listActiveSessions());
    } catch (cause) {
      failLoading(cause);
    }
  }, [show, failLoading]);

  const end = useCallback(async (sessionId: string) => {
    try {
      await session.endSession(sessionId);
      setSessions((current) => current.without(ActiveSessionId.fromPrimitive(sessionId)));
      setFailure(null);
    } catch (cause) {
      setFailure({ action: "session.end", cause });
    }
  }, []);

  return { sessions, isLoading, failure, reload, end };
};
