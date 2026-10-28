import type { AttachmentFile } from "./AttachmentFile.ts";
import type { AttachmentKey } from "./AttachmentKey.ts";

export interface AttachmentRepository {
  upload(file: AttachmentFile): Promise<AttachmentKey>;
}
