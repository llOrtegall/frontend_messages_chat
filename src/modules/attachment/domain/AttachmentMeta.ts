import { AttachmentContentType, type AttachmentContentTypePrimitive } from "./AttachmentContentType.ts";
import { AttachmentFile } from "./AttachmentFile.ts";
import { InvalidAttachmentMetaError } from "./errors/InvalidAttachmentMetaError.ts";

export interface AttachmentMetaPrimitive {
  readonly url: string;
  readonly contentType: AttachmentContentTypePrimitive;
  readonly sizeBytes: number;
}

const PROTOCOLS = ["http:", "https:"];
const UNNAMED_FILE = "archivo";

/** A file attached to a message, as the backend verified it in the bucket. */
export class AttachmentMeta {
  private constructor(
    private readonly url: string,
    private readonly contentType: AttachmentContentType,
    private readonly sizeBytes: number,
  ) {}

  static create(url: string, contentType: AttachmentContentType, sizeBytes: number): AttachmentMeta {
    AttachmentMeta.ensureIsWebAddress(url);
    AttachmentMeta.ensureSizeIsValid(sizeBytes);
    return new AttachmentMeta(url, contentType, sizeBytes);
  }

  static fromPrimitive(data: AttachmentMetaPrimitive): AttachmentMeta {
    return AttachmentMeta.create(data.url, AttachmentContentType.fromPrimitive(data.contentType), data.sizeBytes);
  }

  private static ensureIsWebAddress(url: string): void {
    if (!URL.canParse(url) || !PROTOCOLS.includes(new URL(url).protocol)) throw new InvalidAttachmentMetaError(`"${url}" is not a web address`);
  }

  private static ensureSizeIsValid(sizeBytes: number): void {
    if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > AttachmentFile.MAX_BYTES) {
      throw new InvalidAttachmentMetaError(`${sizeBytes} is not a file size`);
    }
  }

  isImage(): boolean {
    return this.contentType.isImage();
  }

  /** The last part of its address, which keeps the name it was uploaded with. */
  fileName(): string {
    return decodeURIComponent(new URL(this.url).pathname.split("/").at(-1) || UNNAMED_FILE);
  }

  getUrl(): string {
    return this.url;
  }

  getSizeBytes(): number {
    return this.sizeBytes;
  }

  equals(other: AttachmentMeta): boolean {
    return this.url === other.url;
  }

  toPrimitive(): AttachmentMetaPrimitive {
    return { url: this.url, contentType: this.contentType.toPrimitive(), sizeBytes: this.sizeBytes };
  }
}
