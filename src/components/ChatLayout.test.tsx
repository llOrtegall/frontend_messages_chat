import { afterEach, describe, expect, it } from "bun:test";
import { Chat } from "../modules/chat/domain/Chat.ts";
import { ListedRoomList } from "../modules/room/domain/ListedRoomList.ts";
import * as RoomMother from "../modules/room/test/helpers/RoomMother.ts";
import * as CurrentUserMother from "../modules/session/test/helpers/CurrentUserMother.ts";
import { ChatLayout } from "./ChatLayout.tsx";
import { fakeChatSession, fakeSession, renderInApp } from "./test/renderInApp.tsx";

const BASE_TITLE = "Chat App";

describe("ChatLayout", () => {
  afterEach(() => {
    document.title = BASE_TITLE;
  });

  const renderWithUnread = (...unreadCounts: number[]) => {
    document.title = BASE_TITLE;
    const user = CurrentUserMother.create();
    const rooms = ListedRoomList.create(unreadCounts.map((unreadCount) => RoomMother.listed({ unreadCount })));
    const chat = Chat.start(user.getId()).connectionChanged("open").roomsLoaded(rooms);
    return renderInApp(<ChatLayout />, { session: fakeSession({}, user), chatSession: fakeChatSession(chat) });
  };

  it("shows the unread total in the tab title and restores it when the chat closes", () => {
    const { unmount } = renderWithUnread(2, 0, 3);

    expect(document.title).toBe(`(5) ${BASE_TITLE}`);
    unmount();
    expect(document.title).toBe(BASE_TITLE);
  });

  it("leaves the title alone when everything is read", () => {
    renderWithUnread(0, 0);

    expect(document.title).toBe(BASE_TITLE);
  });
});
