import { describe, expect, it, mock } from "bun:test";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as MessageMother from "../modules/message/test/helpers/MessageMother.ts";
import * as CurrentUserMother from "../modules/session/test/helpers/CurrentUserMother.ts";
import { RequestFailedError } from "../modules/shared/domain/errors/RequestFailedError.ts";
import { ChatView } from "./ChatView.tsx";
import * as ChatMother from "./test/ChatMother.ts";
import { fakeChatSession, fakeSession, renderInApp } from "./test/renderInApp.tsx";

const renderOpenGroup = (options?: Parameters<typeof ChatMother.openGroup>[0], failure: Parameters<typeof fakeChatSession>[1] = null) => {
  const group = ChatMother.openGroup(options);
  const chatSession = fakeChatSession(group.chat, failure);
  const session = fakeSession({}, CurrentUserMother.create({ id: group.me.toPrimitive() }));
  renderInApp(<ChatView roomId={group.room.getId().toPrimitive()} />, { session, chatSession });
  return { ...group, chatSession };
};

describe("ChatView", () => {
  it("shows the room and its messages with who wrote them", () => {
    renderOpenGroup({ messages: ["hola", "¿qué tal?"] });

    expect(screen.getByRole("heading", { level: 2, name: "Equipo" })).toBeTruthy();
    const log = screen.getByRole("log", { name: "Mensajes" });
    expect(within(log).getByText("hola")).toBeTruthy();
    expect(within(log).getAllByText("Bea", { exact: true })).toHaveLength(1);
  });

  it("sends what the user wrote and clears the box once sent", async () => {
    const { room, chatSession } = renderOpenGroup();

    await userEvent.type(screen.getByRole("textbox", { name: "Mensaje" }), "buenas");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(chatSession.send).toHaveBeenCalledWith(room.getId().toPrimitive(), "buenas", undefined);
    expect(chatSession.notifyTyping).toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toHaveProperty("value", "");
  });

  it("keeps the send button disabled while there is nothing to send", () => {
    renderOpenGroup();

    expect(screen.getByRole("button", { name: "Enviar" })).toHaveProperty("disabled", true);
  });

  it("shows a message on its way, and offers to retry or discard one that wasn't sent", async () => {
    const group = ChatMother.openGroup();
    const [sending, lost] = [MessageMother.draft({ roomId: group.room.getId().toPrimitive(), body: "voy" }), MessageMother.draft({ roomId: group.room.getId().toPrimitive(), body: "perdido" })];
    const chat = group.chat.messageSending(sending).messageSending(lost).messageNotSent(lost.getClientMessageId());
    const chatSession = fakeChatSession(chat);
    renderInApp(<ChatView roomId={group.room.getId().toPrimitive()} />, { session: fakeSession({}, CurrentUserMother.create({ id: group.me.toPrimitive() })), chatSession });

    expect(screen.getByText("Enviando…")).toBeTruthy();
    expect(screen.getByText("No enviado")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));

    expect(chatSession.retrySend).toHaveBeenCalledWith(lost.getClientMessageId().toPrimitive());
    expect(chatSession.discardSend).toHaveBeenCalledWith(lost.getClientMessageId().toPrimitive());
  });

  it("offers no edit on someone else's message", () => {
    renderOpenGroup();

    expect(screen.queryByRole("button", { name: "Editar mensaje" })).toBeNull();
  });

  it("words the last failure from the dictionary and lets the user dismiss it", async () => {
    const { chatSession } = renderOpenGroup({}, { action: "message.send", cause: new RequestFailedError("room.not_member", null) });

    expect(screen.getByRole("alert").textContent).toContain("Ya no formas parte de esta conversación.");
    await userEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(chatSession.dismissFailure).toHaveBeenCalled();
  });

  it("lets the owner delete the group after confirming", async () => {
    const { room, chatSession } = renderOpenGroup();
    globalThis.confirm = mock(() => true);

    await userEvent.click(screen.getByRole("button", { name: "Eliminar conversación" }));

    expect(chatSession.deleteRoom).toHaveBeenCalledWith(room.getId().toPrimitive());
  });
});
