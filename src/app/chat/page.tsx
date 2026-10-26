"use client";

import { ChatProvider, useSession } from "@/ui/providers";
import { ChatLayout } from "@/ui/components/chat-layout";
import { SessionGate } from "@/ui/components/session-gate";

function Chat() {
  const { user } = useSession();
  // SessionGate only renders this once authenticated; keyed so a different user gets a fresh store.
  return user ? (
    <ChatProvider key={user.id} userId={user.id}>
      <ChatLayout />
    </ChatProvider>
  ) : null;
}

export default function ChatPage() {
  return (
    <SessionGate require="authenticated">
      <Chat />
    </SessionGate>
  );
}
