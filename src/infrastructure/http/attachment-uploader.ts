import {
  ATTACHMENT_MAX_BYTES,
  PresignAttachmentResponseSchema,
  PresignAttachmentSchema,
} from "../../contracts/index.ts";
import type { AttachmentUploader } from "../../domain/ports.ts";
import { AttachmentTooLargeError } from "../../modules/attachment/domain/errors/AttachmentTooLargeError.ts";
import { AttachmentTypeNotAllowedError } from "../../modules/attachment/domain/errors/AttachmentTypeNotAllowedError.ts";
import { EmptyAttachmentError } from "../../modules/attachment/domain/errors/EmptyAttachmentError.ts";
import { RequestFailedError } from "../../modules/shared/domain/errors/RequestFailedError.ts";
import type { ApiHttp } from "../../modules/shared/infrastructure/ApiHttp.ts";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** presign → PUT straight to the bucket. The backend re-checks the stored object when the message is sent. */
export class S3AttachmentUploader implements AttachmentUploader {
  constructor(
    private readonly http: ApiHttp,
    private readonly fetchImpl: Fetch = (url, init) => fetch(url, init),
  ) {}

  async upload(file: Blob): Promise<string> {
    // MIME essence only: "text/plain;charset=utf-8" → "text/plain".
    const contentType = file.type.split(";")[0]!.trim().toLowerCase();
    const input = PresignAttachmentSchema.safeParse({ contentType, sizeBytes: file.size });
    if (!input.success) {
      if (file.size > ATTACHMENT_MAX_BYTES) throw new AttachmentTooLargeError(file.size);
      if (file.size === 0) throw new EmptyAttachmentError();
      throw new AttachmentTypeNotAllowedError(contentType);
    }
    const { url, key } = await this.http.request("POST", "/api/v1/attachments/presign", PresignAttachmentResponseSchema, {
      body: input.data,
    });
    // Content-Type and Content-Length are part of the signature: they must match the presign.
    const res = await this.fetchImpl(url, { method: "PUT", headers: { "Content-Type": input.data.contentType }, body: file });
    if (!res.ok) throw new RequestFailedError("attachment.upload_failed", res.status);
    return key;
  }
}
