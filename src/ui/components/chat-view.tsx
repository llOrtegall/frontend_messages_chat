"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "../../domain/entities.ts";
import { ATTACHMENT_ACCEPT, canDeleteRoom, canEditMessage, roomTitle, senderName } from "../../domain/rules.ts";
import { useSession } from "../../hooks/useSession.ts";
import { useChat } from "../providers.tsx";
import { GroupMembersPanel } from "./group-members-panel.tsx";
import { MessageAttachment, PendingAttachment } from "./message-attachment.tsx";
import { messageFor } from "../../i18n/errorMessages.ts";

const EMPTY: Message[] = [];

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

export function ChatView({ roomId }: { roomId: string }) {
  const { store, rooms, selectedRoom, messages, history, typing, connection, failure } = useChat();
  const user = useSession().user?.toPrimitive() ?? null;
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [pending, setPending] = useState<{ file: File; previewUrl: string | null } | null>(null);
  const pendingRef = useRef(pending);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = messages[roomId] ?? EMPTY;
  const page = history[roomId];
  const [showMembers, setShowMembers] = useState(false);
  const listed = rooms.find((r) => r.id === roomId) ?? null;
  const isGroup = (selectedRoom ?? listed)?.kind === "group";
  const typers = typing[roomId] ?? [];
  const lastId = list.at(-1)?.id;

  // Follow new messages (not older pages being prepended).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastId]);

  // The image preview is an object URL: release it when replaced and when the view unmounts.
  useEffect(() => () => {
    if (pendingRef.current?.previewUrl) URL.revokeObjectURL(pendingRef.current.previewUrl);
  }, []);

  const pickFile = (file: File | null) => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    const next = file && { file, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null };
    pendingRef.current = next;
    setPending(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSend = (draft.trim() !== "" || pending !== null) && !sending && connection === "open";

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    if (await store.send(roomId, draft, pending?.file)) {
      setDraft("");
      pickFile(null);
    }
    setSending(false);
  };

  const saveEdit = async () => {
    if (!editing?.body.trim()) return;
    if (await store.edit(editing.id, editing.body)) setEditing(null);
  };

  const deleteRoom = async () => {
    const label = isGroup ? `el grupo "${listed?.name}"` : "esta conversación";
    if (confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) await store.deleteRoom(roomId);
  };

  return (
    <div className="flex h-full bg-slate-900 text-slate-100">
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <button onClick={() => void store.selectRoom(null)} className="text-slate-400 hover:text-slate-100 transition text-lg leading-none" aria-label="Cerrar conversación">
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{listed ? roomTitle(listed) : "…"}</h2>
            {selectedRoom?.kind === "group" && (
              <button onClick={() => setShowMembers((v) => !v)} aria-expanded={showMembers} className="text-xs text-slate-400 hover:text-slate-200">
                {selectedRoom.members.length} miembro{selectedRoom.members.length !== 1 ? "s" : ""} · ver
              </button>
            )}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              connection === "open" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
            }`}
          >
            {connection === "open" ? "conectado" : connection === "connecting" ? "conectando…" : "sin conexión"}
          </span>
          {selectedRoom && canDeleteRoom(selectedRoom, user) && (
            <button onClick={() => void deleteRoom()} title="Eliminar conversación" aria-label="Eliminar conversación" className="text-slate-400 hover:text-red-400 transition text-sm px-1.5 py-0.5 rounded hover:bg-slate-800">
              🗑
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" role="log" aria-label="Mensajes" aria-relevant="additions">
          {page?.hasMore && list.length > 0 && (
            <div className="text-center">
              <button onClick={() => void store.loadOlder(roomId)} disabled={page.loading} className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50">
                {page.loading ? "Cargando…" : "Cargar anteriores"}
              </button>
            </div>
          )}
          {!page || (page.loading && list.length === 0) ? (
            <div className="text-center text-slate-400 text-sm pt-8">Cargando mensajes…</div>
          ) : list.length === 0 ? (
            <div className="text-center text-slate-400 text-sm pt-8">Sin mensajes aún. ¡Di algo!</div>
          ) : (
            list.map((msg, i) => {
              const own = msg.senderId === user?.id;
              const showSender = isGroup && !own && list[i - 1]?.senderId !== msg.senderId;
            const author = own ? "Tú" : isGroup ? senderName(selectedRoom, msg.senderId) : (listed?.peer?.displayName ?? "Contacto");
              const isEditing = editing?.id === msg.id;
              return (
                <div key={msg.id} className={`group flex items-end gap-2 ${own ? "justify-end" : "justify-start"}`}>
                  {canEditMessage(msg, user) && !isEditing && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition mb-1">
                      <button onClick={() => setEditing({ id: msg.id, body: msg.body })} className="text-xs text-slate-400 hover:text-slate-300 px-1.5 py-0.5 rounded hover:bg-slate-700" title="Editar" aria-label="Editar mensaje">
                        ✎
                      </button>
                      <button onClick={() => void store.deleteMessage(msg.id)} className="text-xs text-slate-400 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-slate-700" title="Borrar" aria-label="Borrar mensaje">
                        ✕
                      </button>
                    </div>
                  )}
                  <div className={`max-w-sm flex flex-col ${own ? "items-end" : "items-start"}`}>
                    {showSender && <span aria-hidden className="text-xs text-purple-300 px-1 mb-0.5">{senderName(selectedRoom, msg.senderId)}</span>}
                    {isEditing ? (
                      <div className="flex gap-1 w-72">
                        <input
                          autoFocus
                          aria-label="Editar mensaje"
                          value={editing.body}
                          onChange={(e) => setEditing({ id: msg.id, body: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveEdit();
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="flex-1 px-3 py-1.5 bg-slate-700 border border-blue-500 rounded-lg text-sm focus:outline-none"
                        />
                        <button onClick={() => void saveEdit()} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs" aria-label="Guardar">✓</button>
                        <button onClick={() => setEditing(null)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs" aria-label="Cancelar">✕</button>
                      </div>
                    ) : (
                      <div className={`px-3 py-2 rounded-2xl space-y-1 ${own ? "bg-blue-600 text-white rounded-br-sm" : "bg-slate-700 rounded-bl-sm"}`}>
                        <span className="sr-only">{author}: </span>
                      {msg.attachmentMeta && <MessageAttachment meta={msg.attachmentMeta} />}
                        {msg.body && <p className="break-words text-sm leading-relaxed">{msg.body}</p>}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                      {formatTime(msg.createdAt)}
                      {msg.editedAt && " · editado"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <div role="status" className="px-4 text-xs text-slate-400 italic min-h-5">
          {typers.length > 0 && (isGroup ? `${typers.map((u) => senderName(selectedRoom, u)).join(", ")} está escribiendo…` : "Está escribiendo…")}
        </div>
        {failure && (
          <div role="alert" className="mx-4 mb-2 px-3 py-2 bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg flex justify-between gap-2">
            <span>{messageFor(failure.cause, failure.action)}</span>
            <button onClick={() => store.dismissFailure()} aria-label="Cerrar aviso">✕</button>
          </div>
        )}

        {pending && <PendingAttachment {...pending} onRemove={() => pickFile(null)} />}

        <form onSubmit={(e) => void send(e)} className="px-4 py-3 border-t border-slate-700 flex gap-2">
          <label
            title="Adjuntar archivo"
            className="px-3 py-2 bg-slate-800 border border-slate-600 hover:bg-slate-700 rounded-xl cursor-pointer text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              disabled={sending}
            />
            <span aria-hidden>📎</span>
            <span className="sr-only">Adjuntar archivo</span>
          </label>
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              store.notifyTyping(roomId);
            }}
            placeholder={connection === "open" ? "Escribe un mensaje…" : "Sin conexión…"}
            aria-label="Mensaje"
            maxLength={4096}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition text-sm font-medium"
          >
            {sending && pending ? "Subiendo…" : "Enviar"}
          </button>
        </form>
      </div>
      {showMembers && selectedRoom?.kind === "group" && <GroupMembersPanel room={selectedRoom} onClose={() => setShowMembers(false)} />}
    </div>
  );
}
