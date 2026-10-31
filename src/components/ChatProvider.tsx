"use client";

import { useEffect, useState } from "react";
import { ChatContext } from "../hooks/useChat.ts";
import { ChatSession } from "../hooks/ChatSession.ts";
import { usePageVisibility } from "../hooks/usePageVisibility.ts";
import { chat } from "../modules/chat/application/factory.ts";
import { messages } from "../modules/message/application/factory.ts";
import { rooms } from "../modules/room/application/factory.ts";

/** Owns the chat (and its WebSocket) of the signed-in user while mounted; key it by user. */
export const ChatProvider = ({ userId, children }: { readonly userId: string; readonly children: React.ReactNode }) => {
  const [session] = useState(() => new ChatSession(userId, { chat, rooms, messages }));
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    session.pageVisibilityChanged(isPageVisible);
  }, [session, isPageVisible]);

  useEffect(() => {
    session.start();
    return () => session.stop();
  }, [session]);

  return <ChatContext.Provider value={session}>{children}</ChatContext.Provider>;
};
