import { describe, expect, it } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as CurrentUserMother from "../modules/session/test/helpers/CurrentUserMother.ts";
import { GroupMembersPanel } from "./GroupMembersPanel.tsx";
import * as ChatMother from "./test/ChatMother.ts";
import { fakeChatSession, fakeSession, renderInApp } from "./test/renderInApp.tsx";

const renderPanel = (myRole: "owner" | "member") => {
  const group = ChatMother.openGroup({ myRole });
  const chatSession = fakeChatSession(group.chat);
  const session = fakeSession({}, CurrentUserMother.create({ id: group.me.toPrimitive() }));
  renderInApp(<GroupMembersPanel room={group.room} onClose={() => {}} />, { session, chatSession });
  return { ...group, chatSession };
};

describe("GroupMembersPanel", () => {
  it("lets the owner promote and remove members, but not leave", async () => {
    const { room, bea, chatSession } = renderPanel("owner");

    await userEvent.click(screen.getByRole("button", { name: "Hacer admin" }));

    expect(chatSession.changeMemberRole).toHaveBeenCalledWith(room.getId().toPrimitive(), bea.toPrimitive(), "admin");
    expect(screen.getByRole("button", { name: "Quitar a Bea del grupo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Salir del grupo" })).toBeNull();
  });

  it("gives a plain member nothing to manage, only leaving", () => {
    renderPanel("member");

    expect(screen.queryByRole("button", { name: "Hacer admin" })).toBeNull();
    expect(screen.queryByRole("button", { name: "+ Añadir miembro" })).toBeNull();
    expect(screen.getByRole("button", { name: "Salir del grupo" })).toBeTruthy();
    expect(screen.getByText("(tú)", { exact: false })).toBeTruthy();
  });
});
