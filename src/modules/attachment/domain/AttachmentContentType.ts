import { AttachmentTypeNotAllowedError } from "./errors/AttachmentTypeNotAllowedError.ts";

// The backend's allowlist (no SVG or HTML: they could run scripts from the bucket's origin).
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "text/plain"] as const;

export type AttachmentContentTypePrimitive = (typeof ALLOWED)[number];

export class AttachmentContentType {
  static readonly ALLOWED: readonly AttachmentContentTypePrimitive[] = ALLOWED;

  private constructor(private readonly value: AttachmentContentTypePrimitive) {}

  /** Accepts a full MIME type ("text/plain;charset=utf-8") and keeps its essence ("text/plain"). */
  static create(value: string): AttachmentContentType {
    const essence = value.split(";")[0]!.trim().toLowerCase();
    return new AttachmentContentType(AttachmentContentType.ensureIsAllowed(essence));
  }

  static fromPrimitive(data: AttachmentContentTypePrimitive): AttachmentContentType {
    return AttachmentContentType.create(data);
  }

  /** For `<input type="file" accept>`. */
  static acceptedForAttachments(): string {
    return ALLOWED.join(",");
  }

  static acceptedForAvatars(): string {
    return ALLOWED.filter((type) => type.startsWith("image/")).join(",");
  }

  private static ensureIsAllowed(value: string): AttachmentContentTypePrimitive {
    const allowed = ALLOWED.find((type) => type === value);
    if (!allowed) throw new AttachmentTypeNotAllowedError(value);
    return allowed;
  }

  isImage(): boolean {
    return this.value.startsWith("image/");
  }

  equals(other: AttachmentContentType): boolean {
    return this.value === other.value;
  }

  toPrimitive(): AttachmentContentTypePrimitive {
    return this.value;
  }
}
