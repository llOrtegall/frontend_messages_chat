import { PresignAttachmentResponseSchema, type AttachmentContentType as ContractContentType } from "../../../contracts/index.ts";
import { RequestFailedError } from "../../shared/domain/errors/RequestFailedError.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import type { AttachmentContentTypePrimitive } from "../domain/AttachmentContentType.ts";
import type { AttachmentFile } from "../domain/AttachmentFile.ts";
import { AttachmentKey } from "../domain/AttachmentKey.ts";
import type { AttachmentRepository } from "../domain/AttachmentRepository.ts";

export type BucketFetch = (url: string, init: RequestInit) => Promise<Response>;
type SameMembers<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

// Fails to compile when the domain's allowlist drifts from the backend's.
const ALLOWLIST_MATCHES_BACKEND: SameMembers<AttachmentContentTypePrimitive, ContractContentType> = true;
void ALLOWLIST_MATCHES_BACKEND;

/** Asks the backend for a signed URL, then PUTs the file straight to the bucket. */
export class S3AttachmentRepository implements AttachmentRepository {
  constructor(
    private readonly http: ApiHttp,
    private readonly bucketFetch: BucketFetch = (url, init) => fetch(url, init),
  ) {}

  async upload(file: AttachmentFile): Promise<AttachmentKey> {
    const contentType = file.getContentType().toPrimitive();
    const { url, key } = await this.http.request("POST", "/api/v1/attachments/presign", PresignAttachmentResponseSchema, {
      body: { contentType, sizeBytes: file.getSizeBytes() },
    });
    // Content-Type and Content-Length are part of the signature: they must match the presign.
    const response = await this.bucketFetch(url, { method: "PUT", headers: { "Content-Type": contentType }, body: file.toPrimitive() });
    if (!response.ok) throw new RequestFailedError("attachment.upload_failed", response.status);
    return AttachmentKey.fromPrimitive(key);
  }
}
