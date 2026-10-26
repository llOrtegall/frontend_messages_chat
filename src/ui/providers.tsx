"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { createContainer, type Container } from "../composition-root.ts";
import type { ChatState, ChatStore } from "../application/chat-store.ts";
import type { SessionState } from "../application/session-store.ts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const ContainerContext = createContext<Container | null>(null);
const ChatContext = createContext<ChatStore | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [container] = useState(() => createContainer(API_URL));

  useEffect(() => {
    void container.session.restore();
  }, [container]);

  return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>;
}

export function useContainer(): Container {
  const c = useContext(ContainerContext);
  if (!c) throw new Error("useContainer must be used within <Providers>");
  return c;
}

export function useSession(): SessionState & { store: Container["session"] } {
  const { session } = useContainer();
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { ...state, store: session };
}

/** Owns the chat store (and its WebSocket) for the signed-in user while mounted. */
export function ChatProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const { createChat } = useContainer();
  const [store] = useState(() => createChat(userId));

  useEffect(() => {
    store.start();
    return () => store.stop();
  }, [store]);

  return <ChatContext.Provider value={store}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatState & { store: ChatStore } {
  const store = useContext(ChatContext);
  if (!store) throw new Error("useChat must be used within <ChatProvider>");
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, store };
}
