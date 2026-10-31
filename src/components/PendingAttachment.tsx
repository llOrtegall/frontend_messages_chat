import { formatBytes } from "./formatBytes.ts";

/** Selected file before sending: thumbnail for images, name and size otherwise. */
export function PendingAttachment({ file, previewUrl, onRemove }: { file: File; previewUrl: string | null; onRemove: () => void }) {
  return (
    <div className="mx-4 mb-2 flex items-center gap-3 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview */}
      {previewUrl && <img src={previewUrl} alt="Vista previa del adjunto" className="h-12 w-12 object-cover rounded" />}
      <span className="flex-1 truncate">{file.name}</span>
      <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
      <button type="button" onClick={onRemove} aria-label="Quitar adjunto" className="text-slate-400 hover:text-red-400">
        ✕
      </button>
    </div>
  );
}
