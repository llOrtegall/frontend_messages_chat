import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import { apiHttp } from "../../shared/application/factory.ts";
import { S3AttachmentRepository, type BucketFetch } from "../infrastructure/S3AttachmentRepository.ts";
import { uploadAttachment } from "./uploadAttachment.ts";

export const attachmentModule = (http: ApiHttp, bucketFetch?: BucketFetch) => {
  const attachmentRepository = new S3AttachmentRepository(http, bucketFetch);

  return {
    uploadAttachment: uploadAttachment({ attachmentRepository }),
  };
};

export type AttachmentModule = ReturnType<typeof attachmentModule>;

export const attachments = attachmentModule(apiHttp);
