import { useState } from "react";
import type { Message } from "../modules/message/domain/Message.ts";
import { MessageAttachment } from "./MessageAttachment.tsx";

const formatTime = (at: Date) => at.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

interface MessageItemProps {
  readonly message: Message;
  readonly isOwn: boolean;
  /** Who wrote it, for screen readers. */
  readonly author: string;
  /** Shown above the bubble in groups, when the previous message is from someone else. */
  readonly senderLabel: string | null;
  readonly canEdit: boolean;
  readonly onEdit: (text: string) => Promise<boolean>;
  readonly onDelete: () => void;
}

export const MessageItem = ({ message, isOwn, author, senderLabel, canEdit, onEdit, onDelete }: MessageItemProps) => {
  const [editing, setEditing] = useState<string | null>(null);
  const body = message.getBody().toPrimitive();
  const attachment = message.getAttachment();

  const save = async () => {
    if (editing?.trim() && (await onEdit(editing))) setEditing(null);
  };

  return (
    <div className={`group flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {canEdit && editing === null && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition mb-1">
          <button onClick={() => setEditing(body)} className="text-xs text-slate-400 hover:text-slate-300 px-1.5 py-0.5 rounded hover:bg-slate-700" title="Editar" aria-label="Editar mensaje">
            ✎
          </button>
          <button onClick={onDelete} className="text-xs text-slate-400 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-slate-700" title="Borrar" aria-label="Borrar mensaje">
            ✕
          </button>
        </div>
      )}
      <div className={`max-w-sm flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {senderLabel && <span aria-hidden className="text-xs text-purple-300 px-1 mb-0.5">{senderLabel}</span>}
        {editing !== null ? (
          <div className="flex gap-1 w-72">
            <input
              autoFocus
              aria-label="Editar mensaje"
              value={editing}
              onChange={(e) => setEditing(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
                if (e.key === "Escape") setEditing(null);
              }}
              className="flex-1 px-3 py-1.5 bg-slate-700 border border-blue-500 rounded-lg text-sm focus:outline-none"
            />
            <button onClick={() => void save()} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs" aria-label="Guardar">✓</button>
            <button onClick={() => setEditing(null)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs" aria-label="Cancelar">✕</button>
          </div>
        ) : (
          <div className={`px-3 py-2 rounded-2xl space-y-1 ${isOwn ? "bg-blue-600 text-white rounded-br-sm" : "bg-slate-700 rounded-bl-sm"}`}>
            <span className="sr-only">{author}: </span>
            {attachment && <MessageAttachment attachment={attachment} />}
            {body && <p className="break-words text-sm leading-relaxed">{body}</p>}
          </div>
        )}
        <span className="text-[10px] text-slate-400 mt-0.5 px-1">
          {formatTime(message.getCreatedAt())}
          {message.wasEdited() && " · editado"}
        </span>
      </div>
    </div>
  );
};
