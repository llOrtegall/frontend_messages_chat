import { formatBytes } from "./formatBytes.ts";
import type { AttachmentMeta } from "../modules/attachment/domain/AttachmentMeta.ts";

export function MessageAttachment({ attachment }: { attachment: AttachmentMeta }) {
  const url = attachment.getUrl();
  if (attachment.isImage()) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on the storage host, not optimizable */}
        <img src={url} alt="Imagen adjunta" loading="lazy" className="max-h-64 max-w-full rounded-lg" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="flex items-center gap-2 text-sm underline underline-offset-2"
    >
      <span aria-hidden>📎</span>
      <span className="truncate">{attachment.fileName()}</span>
      <span className="text-xs opacity-70 no-underline">({formatBytes(attachment.getSizeBytes())})</span>
    </a>
  );
}
