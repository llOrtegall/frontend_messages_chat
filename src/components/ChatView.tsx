"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat.ts";
import { useSession } from "../hooks/useSession.ts";
import { messageFor } from "../i18n/errorMessages.ts";
import { MessageList } from "../modules/message/domain/MessageList.ts";
import { RoomId } from "../modules/room/domain/RoomId.ts";
import type { UserId } from "../modules/user/domain/UserId.ts";
import { GroupMembersPanel } from "./GroupMembersPanel.tsx";
import { MessageComposer } from "./MessageComposer.tsx";
import { MessageItem } from "./MessageItem.tsx";
import { OutgoingMessageItem } from "./OutgoingMessageItem.tsx";
import { roomTitle } from "./roomTitle.ts";

const CONNECTION_LABEL = { open: "conectado", connecting: "conectando…", closed: "sin conexión" } as const;

export function ChatView({ roomId }: { roomId: string }) {
  const { chat, session, failure } = useChat();
  const me = useSession().user?.getId() ?? null;
  const [showMembers, setShowMembers] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const id = RoomId.fromPrimitive(roomId);
  const openRoom = chat.getOpenRoom();
  const listed = chat.getRooms()?.find(id) ?? null;
  const history = chat.historyOf(id);
  const messages = (history?.getMessages() ?? MessageList.empty()).map((message) => message);
  const outgoing = chat.outgoingIn(id);
  const typists = chat.typistsIn(id);
  const connection = chat.getConnection();
  const isGroup = openRoom?.isGroup() ?? listed?.isGroup() ?? false;
  const senderName = (userId: UserId) => openRoom?.nameOf(userId)?.toPrimitive() ?? "Antiguo miembro";
  const lastId = messages.at(-1)?.getId().toPrimitive();
  const outgoingCount = outgoing.count();

  // Follow new messages (not older pages being prepended).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastId, outgoingCount]);

  const deleteRoom = async () => {
    const label = isGroup ? `el grupo "${listed?.title() ?? ""}"` : "esta conversación";
    if (confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) await session.deleteRoom(roomId);
  };

  return (
    <div className="flex h-full bg-slate-900 text-slate-100">
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <button onClick={() => void session.selectRoom(null)} className="text-slate-400 hover:text-slate-100 transition text-lg leading-none" aria-label="Cerrar conversación">
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{listed ? roomTitle(listed) : "…"}</h2>
            {openRoom?.isGroup() && (
              <button onClick={() => setShowMembers((shown) => !shown)} aria-expanded={showMembers} className="text-xs text-slate-400 hover:text-slate-200">
                {openRoom.getMembers().count()} miembro{openRoom.getMembers().count() !== 1 ? "s" : ""} · ver
              </button>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${connection === "open" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
            {CONNECTION_LABEL[connection]}
          </span>
          {openRoom && me && openRoom.canBeDeletedBy(me) && (
            <button onClick={() => void deleteRoom()} title="Eliminar conversación" aria-label="Eliminar conversación" className="text-slate-400 hover:text-red-400 transition text-sm px-1.5 py-0.5 rounded hover:bg-slate-800">
              🗑
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" role="log" aria-label="Mensajes" aria-relevant="additions">
          {history?.hasMore() && messages.length > 0 && (
            <div className="text-center">
              <button onClick={() => void session.loadOlder(roomId)} disabled={history.isLoading()} className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50">
                {history.isLoading() ? "Cargando…" : "Cargar anteriores"}
              </button>
            </div>
          )}
          {!history || (history.isLoading() && messages.length === 0) ? (
            <div className="text-center text-slate-400 text-sm pt-8">Cargando mensajes…</div>
          ) : messages.length === 0 && outgoing.isEmpty() ? (
            <div className="text-center text-slate-400 text-sm pt-8">Sin mensajes aún. ¡Di algo!</div>
          ) : (
            messages.map((message, index) => {
              const sender = message.getSenderId();
              const isOwn = me !== null && message.isFrom(me);
              const startsRun = !messages[index - 1]?.isFrom(sender);
              return (
                <MessageItem
                  key={message.getId().toPrimitive()}
                  message={message}
                  isOwn={isOwn}
                  author={isOwn ? "Tú" : isGroup ? senderName(sender) : (listed?.title() ?? "Contacto")}
                  senderLabel={isGroup && !isOwn && startsRun ? senderName(sender) : null}
                  canEdit={me !== null && message.canBeEditedBy(me)}
                  onEdit={(text) => session.edit(message.getId().toPrimitive(), text)}
                  onDelete={() => void session.deleteMessage(message.getId().toPrimitive())}
                />
              );
            })
          )}
          {outgoing.map((message) => {
            const clientMessageId = message.getId().toPrimitive();
            return (
              <OutgoingMessageItem
                key={clientMessageId}
                message={message}
                onRetry={() => session.retrySend(clientMessageId)}
                onDiscard={() => session.discardSend(clientMessageId)}
              />
            );
          })}
          <div ref={endRef} />
        </div>

        <div role="status" className="px-4 text-xs text-slate-400 italic min-h-5">
          {typists.length > 0 && (isGroup ? `${typists.map(senderName).join(", ")} está escribiendo…` : "Está escribiendo…")}
        </div>
        {failure && (
          <div role="alert" className="mx-4 mb-2 px-3 py-2 bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg flex justify-between gap-2">
            <span>{messageFor(failure.cause, failure.action)}</span>
            <button onClick={() => session.dismissFailure()} aria-label="Cerrar aviso">✕</button>
          </div>
        )}

        <MessageComposer
          isConnected={connection === "open"}
          onSend={(text, file) => session.send(roomId, text, file)}
          onTyping={() => session.notifyTyping(roomId)}
        />
      </div>
      {showMembers && openRoom?.isGroup() && <GroupMembersPanel room={openRoom} onClose={() => setShowMembers(false)} />}
    </div>
  );
}
