import { AttachmentContentType } from "./AttachmentContentType.ts";
import { AttachmentTooLargeError } from "./errors/AttachmentTooLargeError.ts";
import { EmptyAttachmentError } from "./errors/EmptyAttachmentError.ts";

export type AttachmentFilePrimitive = Blob;

/** A file the user picked, checked against what the backend accepts before anything is uploaded. */
export class AttachmentFile {
  static readonly MAX_BYTES = 50 * 1024 * 1024;

  private constructor(
    private readonly content: Blob,
    private readonly contentType: AttachmentContentType,
  ) {}

  static create(content: Blob): AttachmentFile {
    AttachmentFile.ensureIsNotEmpty(content);
    AttachmentFile.ensureIsWithinLimit(content);
    return new AttachmentFile(content, AttachmentContentType.create(content.type));
  }

  static fromPrimitive(data: AttachmentFilePrimitive): AttachmentFile {
    return AttachmentFile.create(data);
  }

  private static ensureIsNotEmpty(content: Blob): void {
    if (content.size === 0) throw new EmptyAttachmentError();
  }

  private static ensureIsWithinLimit(content: Blob): void {
    if (content.size > AttachmentFile.MAX_BYTES) throw new AttachmentTooLargeError(content.size);
  }

  getContentType(): AttachmentContentType {
    return this.contentType;
  }

  getSizeBytes(): number {
    return this.content.size;
  }

  equals(other: AttachmentFile): boolean {
    return this.content === other.content;
  }

  toPrimitive(): AttachmentFilePrimitive {
    return this.content;
  }
}
