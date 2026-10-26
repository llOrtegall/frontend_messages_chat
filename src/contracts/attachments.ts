import { z } from "zod";
import { IsoDateTime } from "./common.ts";

// Only types that browsers never execute when opened from the bucket's origin:
// no SVG, HTML, XML or anything scriptable.
export const ATTACHMENT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
] as const;
export const AttachmentContentTypeSchema = z.enum(ATTACHMENT_CONTENT_TYPES);
export type AttachmentContentType = z.infer<typeof AttachmentContentTypeSchema>;

export const ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export const AttachmentMetaSchema = z.strictObject({
  url: z.url(),
  contentType: AttachmentContentTypeSchema,
  sizeBytes: z.number().int().min(1).max(ATTACHMENT_MAX_BYTES),
});
export type AttachmentMeta = z.infer<typeof AttachmentMetaSchema>;

export const PresignAttachmentSchema = z.object({
  contentType: AttachmentContentTypeSchema,
  sizeBytes: z.number().int().min(1).max(ATTACHMENT_MAX_BYTES),
});
export type PresignAttachmentInput = z.infer<typeof PresignAttachmentSchema>;

// The upload must be a PUT to `url` with exactly the presigned Content-Type and Content-Length.
export const PresignAttachmentResponseSchema = z.strictObject({
  url: z.url(),
  key: z.string(),
  expiresAt: IsoDateTime,
  publicUrl: z.url(),
});
export type PresignAttachmentResponse = z.infer<typeof PresignAttachmentResponseSchema>;

export const ConfirmAttachmentResponseSchema = z.strictObject({
  publicUrl: z.url(),
  attachment: AttachmentMetaSchema,
});
export type ConfirmAttachmentResponse = z.infer<typeof ConfirmAttachmentResponseSchema>;
