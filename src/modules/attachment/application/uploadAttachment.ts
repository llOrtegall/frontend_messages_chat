import { AttachmentFile } from "../domain/AttachmentFile.ts";
import type { AttachmentKey } from "../domain/AttachmentKey.ts";
import type { AttachmentRepository } from "../domain/AttachmentRepository.ts";

export const uploadAttachment = ({ attachmentRepository }: { readonly attachmentRepository: AttachmentRepository }) =>
  async (content: Blob): Promise<AttachmentKey> => attachmentRepository.upload(AttachmentFile.create(content));
