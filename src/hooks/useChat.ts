"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { ChatSession, ChatSnapshot } from "./ChatSession.ts";

export const ChatContext = createContext<ChatSession | null>(null);

/** The open chat of the signed-in user, kept current by the realtime channel. */
export const useChat = (): ChatSnapshot & { readonly session: ChatSession } => {
  const session = useContext(ChatContext);
  if (!session) throw new Error("useChat must be used within <ChatProvider>");
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { ...snapshot, session };
};
