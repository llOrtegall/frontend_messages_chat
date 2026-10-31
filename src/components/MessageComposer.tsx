import { useEffect, useRef, useState } from "react";
import { AttachmentContentType } from "../modules/attachment/domain/AttachmentContentType.ts";
import { MessageDraft } from "../modules/message/domain/MessageDraft.ts";
import { PendingAttachment } from "./PendingAttachment.tsx";

interface MessageComposerProps {
  readonly isConnected: boolean;
  readonly onSend: (text: string, file?: File) => Promise<boolean>;
  readonly onTyping: () => void;
}

export const MessageComposer = ({ isConnected, onSend, onTyping }: MessageComposerProps) => {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<{ file: File; previewUrl: string | null } | null>(null);
  const pendingRef = useRef(pending);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The image preview is an object URL: release it when replaced and when the composer unmounts.
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

  const canSend = MessageDraft.hasContent(draft, pending !== null) && !sending;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    if (await onSend(draft, pending?.file)) {
      setDraft("");
      pickFile(null);
    }
    setSending(false);
  };

  return (
    <>
      {pending && <PendingAttachment {...pending} onRemove={() => pickFile(null)} />}
      <form onSubmit={(e) => void send(e)} className="px-4 py-3 border-t border-slate-700 flex gap-2">
        <label
          title="Adjuntar archivo"
          className="px-3 py-2 bg-slate-800 border border-slate-600 hover:bg-slate-700 rounded-xl cursor-pointer text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={AttachmentContentType.acceptedForAttachments()}
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
            onTyping();
          }}
          placeholder={isConnected ? "Escribe un mensaje…" : "Sin conexión: se enviará al reconectar"}
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
    </>
  );
};
