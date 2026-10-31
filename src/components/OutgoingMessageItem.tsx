import type { OutgoingMessage } from "../modules/message/domain/OutgoingMessage.ts";

interface OutgoingMessageItemProps {
  readonly message: OutgoingMessage;
  readonly onRetry: () => void;
  readonly onDiscard: () => void;
}

export const OutgoingMessageItem = ({ message, onRetry, onDiscard }: OutgoingMessageItemProps) => {
  const draft = message.getDraft();
  const body = draft.getBody().toPrimitive();
  const hasFailed = message.hasFailed();

  return (
    <div className="flex justify-end">
      <div className="max-w-sm flex flex-col items-end">
        <div className={`px-3 py-2 rounded-2xl rounded-br-sm space-y-1 text-white ${hasFailed ? "bg-blue-900 border border-red-500" : "bg-blue-800"}`}>
          <span className="sr-only">Tú: </span>
          {draft.hasAttachment() && <p className="text-xs">📎 Archivo adjunto</p>}
          {body && <p className="break-words text-sm leading-relaxed">{body}</p>}
        </div>
        {hasFailed ? (
          <span className="text-[11px] text-red-300 mt-0.5 px-1 flex gap-2">
            No enviado
            <button onClick={onRetry} className="underline hover:text-red-100">Reintentar</button>
            <button onClick={onDiscard} className="underline hover:text-red-100">Descartar</button>
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 mt-0.5 px-1">Enviando…</span>
        )}
      </div>
    </div>
  );
};
