"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { createContainer, type Container } from "../composition-root.ts";
import { config } from "../config.ts";
import { apiHttp } from "../modules/shared/application/factory.ts";
import type { ChatState, ChatStore } from "../application/chat-store.ts";

const ContainerContext = createContext<Container | null>(null);
const ChatContext = createContext<ChatStore | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [container] = useState(() => createContainer(apiHttp, config.apiUrl));

  return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>;
}

export function useContainer(): Container {
  const c = useContext(ContainerContext);
  if (!c) throw new Error("useContainer must be used within <Providers>");
  return c;
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
