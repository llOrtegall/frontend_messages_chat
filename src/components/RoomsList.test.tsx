import { describe, expect, it } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import { Chat } from "../modules/chat/domain/Chat.ts";
import { ListedRoomList } from "../modules/room/domain/ListedRoomList.ts";
import * as RoomMother from "../modules/room/test/helpers/RoomMother.ts";
import { UserId } from "../modules/user/domain/UserId.ts";
import { RoomsList } from "./RoomsList.tsx";
import { fakeChatSession, renderInApp } from "./test/renderInApp.tsx";

const me = UserId.fromPrimitive(faker.string.uuid());

describe("RoomsList", () => {
  it("waits for the first load before saying there are no rooms", () => {
    renderInApp(<RoomsList onNewConversation={() => {}} />, { chatSession: fakeChatSession(Chat.start(me)) });

    expect(screen.getByText("Cargando…")).toBeTruthy();
  });

  it("hides the unread count of a muted room and says it is muted", () => {
    const muted = RoomMother.listed({ name: "Ruido", unreadCount: 4, mutedUntil: new Date(Date.now() + 3_600_000).toISOString() });
    renderInApp(<RoomsList onNewConversation={() => {}} />, { chatSession: fakeChatSession(Chat.start(me).roomsLoaded(ListedRoomList.create([muted]))) });

    const room = screen.getByRole("button", { name: /Ruido/ });
    expect(room.textContent).toContain("silenciada");
    expect(room.textContent).not.toContain("sin leer");
  });

  it("lists the rooms with their unread count and opens one on click", async () => {
    const group = RoomMother.listed({ name: "Equipo", unreadCount: 3 });
    const direct = RoomMother.listed({ kind: "dm", name: null, unreadCount: 0, peer: { id: faker.string.uuid(), displayName: "Bea", avatarUrl: null } });
    const chatSession = fakeChatSession(Chat.start(me).roomsLoaded(ListedRoomList.create([group, direct])));
    renderInApp(<RoomsList onNewConversation={() => {}} />, { chatSession });

    await userEvent.click(screen.getByRole("button", { name: /Equipo/ }));

    expect(screen.getByRole("button", { name: /Equipo/ }).textContent).toContain("3 sin leer");
    expect(screen.getByRole("button", { name: /Bea/ })).toBeTruthy();
    expect(chatSession.selectRoom).toHaveBeenCalledWith(group.getId().toPrimitive());
  });
});
