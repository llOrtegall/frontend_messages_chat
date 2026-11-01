"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { session } from "../modules/session/application/factory.ts";
import type { SignInInput } from "../modules/session/application/signIn.ts";
import type { SignUpInput } from "../modules/session/application/signUp.ts";
import type { UpdateProfileInput } from "../modules/session/application/updateProfile.ts";
import type { CurrentUser } from "../modules/session/domain/CurrentUser.ts";

export type SessionState =
  | { readonly status: "loading"; readonly user: null }
  | { readonly status: "anonymous"; readonly user: null }
  | { readonly status: "authenticated"; readonly user: CurrentUser };

const LOADING: SessionState = { status: "loading", user: null };
const ANONYMOUS: SessionState = { status: "anonymous", user: null };
const signedInAs = (user: CurrentUser | null): SessionState => (user ? { status: "authenticated", user } : ANONYMOUS);

/** The session of the whole app; rendered once by <SessionProvider>. */
export const useSessionState = () => {
  const [state, setState] = useState<SessionState>(LOADING);
  const restoreStarted = useRef(false);

  useEffect(() => session.watchSessionExpiry(() => setState(ANONYMOUS)), []);

  useEffect(() => {
    // StrictMode runs effects twice; the refresh token rotates, so restore only once.
    if (restoreStarted.current) return;
    restoreStarted.current = true;
    session.restoreSession().then(
      (user) => setState(signedInAs(user)),
      () => setState(ANONYMOUS),
    );
  }, []);

  const signIn = useCallback(async (input: SignInInput) => setState(signedInAs(await session.signIn(input))), []);

  const signUp = useCallback(async (input: SignUpInput) => setState(signedInAs(await session.signUp(input))), []);

  const signOut = useCallback(async () => {
    try {
      await session.signOut();
    } finally {
      setState(ANONYMOUS);
    }
  }, []);

  const user = state.user;
  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      if (user) setState(signedInAs(await session.updateProfile(user, input)));
    },
    [user],
  );

  const confirmEmailVerification = useCallback(async (token: string) => {
    await session.confirmEmailVerification(token);
    setState((current) => (current.user ? signedInAs(current.user.markEmailVerified(new Date())) : current));
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    await session.resetPassword(token, newPassword);
    setState(ANONYMOUS);
  }, []);

  return useMemo(
    () => ({
      ...state,
      signIn,
      signUp,
      signOut,
      updateProfile,
      confirmEmailVerification,
      resetPassword,
      requestEmailVerification: session.requestEmailVerification,
      requestPasswordReset: session.requestPasswordReset,
      changePassword: session.changePassword,
    }),
    [state, signIn, signUp, signOut, updateProfile, confirmEmailVerification, resetPassword],
  );
};

export type Session = ReturnType<typeof useSessionState>;

export const SessionContext = createContext<Session | null>(null);

export const useSession = (): Session => {
  const current = useContext(SessionContext);
  if (!current) throw new Error("useSession must be used within <SessionProvider>");
  return current;
};
