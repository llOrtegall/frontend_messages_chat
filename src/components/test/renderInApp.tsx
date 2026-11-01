import { mock } from "bun:test";
import { render } from "@testing-library/react";
import type { ChatSession, ChatSnapshot } from "../../hooks/ChatSession.ts";
import { ChatContext } from "../../hooks/useChat.ts";
import { SessionContext, type Session } from "../../hooks/useSession.ts";
import type { Chat } from "../../modules/chat/domain/Chat.ts";
import type { CurrentUser } from "../../modules/session/domain/CurrentUser.ts";
import * as CurrentUserMother from "../../modules/session/test/helpers/CurrentUserMother.ts";

export const fakeSession = (overrides: Partial<Session> = {}, user: CurrentUser = CurrentUserMother.create()): Session =>
  ({
    status: "authenticated",
    user,
    signIn: mock(async () => {}),
    signUp: mock(async () => {}),
    signOut: mock(async () => {}),
    updateProfile: mock(async () => {}),
    confirmEmailVerification: mock(async () => {}),
    resetPassword: mock(async () => {}),
    requestEmailVerification: mock(async () => {}),
    requestPasswordReset: mock(async () => {}),
    changePassword: mock(async () => {}),
    ...overrides,
  }) as Session;

/** A chat session frozen on `chat`; every action is a mock that succeeds unless overridden. */
export const fakeChatSession = (chat: Chat, failure: ChatSnapshot["failure"] = null) => {
  const snapshot: ChatSnapshot = { chat, failure };
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    selectRoom: mock(async () => {}),
    loadOlder: mock(async () => {}),
    send: mock(async () => true),
    retrySend: mock(() => {}),
    discardSend: mock(() => {}),
    edit: mock(async () => true),
    deleteMessage: mock(async () => true),
    addMember: mock(async () => true),
    removeMember: mock(async () => true),
    leaveGroup: mock(async () => true),
    changeMemberRole: mock(async () => true),
    deleteRoom: mock(async () => true),
    muteRoom: mock(async () => true),
    unmuteRoom: mock(async () => true),
    openDirect: mock(async () => ""),
    createGroup: mock(async () => ""),
    notifyTyping: mock(() => {}),
    dismissFailure: mock(() => {}),
  };
};

export const renderInApp = (
  ui: React.ReactElement,
  { session = fakeSession(), chatSession }: { session?: Session; chatSession?: ReturnType<typeof fakeChatSession> } = {},
) =>
  render(
    <SessionContext.Provider value={session}>
      {chatSession ? <ChatContext.Provider value={chatSession as unknown as ChatSession}>{ui}</ChatContext.Provider> : ui}
    </SessionContext.Provider>,
  );
