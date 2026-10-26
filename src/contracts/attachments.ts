import { z } from "zod";
import { IsoDateTime } from "./common.ts";

export const PresignAttachmentSchema = z.object({
  contentType: z.string().min(1).max(128),
  sizeBytes: z.number().int().min(1).max(50 * 1024 * 1024), // 50 MB max
});
export type PresignAttachmentInput = z.infer<typeof PresignAttachmentSchema>;

export const PresignAttachmentResponseSchema = z.strictObject({
  url: z.url(),
  key: z.string(),
  expiresAt: IsoDateTime,
  publicUrl: z.url(),
});
export type PresignAttachmentResponse = z.infer<typeof PresignAttachmentResponseSchema>;

export const ConfirmAttachmentResponseSchema = z.strictObject({ publicUrl: z.url() });
