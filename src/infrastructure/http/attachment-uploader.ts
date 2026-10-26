import {
  ATTACHMENT_MAX_BYTES,
  PresignAttachmentResponseSchema,
  PresignAttachmentSchema,
} from "../../contracts/index.ts";
import type { AttachmentUploader } from "../../domain/ports.ts";
import type { HttpClient } from "./http-client.ts";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** presign → PUT straight to the bucket. The backend re-checks the stored object when the message is sent. */
export class S3AttachmentUploader implements AttachmentUploader {
  constructor(
    private readonly http: HttpClient,
    private readonly fetchImpl: Fetch = (url, init) => fetch(url, init),
  ) {}

  async upload(file: Blob): Promise<string> {
    // MIME essence only: "text/plain;charset=utf-8" → "text/plain".
    const contentType = file.type.split(";")[0]!.trim().toLowerCase();
    const input = PresignAttachmentSchema.safeParse({ contentType, sizeBytes: file.size });
    if (!input.success) {
      throw new Error(
        file.size > ATTACHMENT_MAX_BYTES
          ? `El archivo supera el máximo de ${ATTACHMENT_MAX_BYTES / 1024 / 1024} MB`
          : file.size === 0
            ? "El archivo está vacío"
            : "Tipo de archivo no permitido (imágenes, PDF o texto)",
      );
    }
    const { url, key } = await this.http.request("POST", "/api/v1/attachments/presign", PresignAttachmentResponseSchema, {
      body: input.data,
    });
    // Content-Type and Content-Length are part of the signature: they must match the presign.
    const res = await this.fetchImpl(url, { method: "PUT", headers: { "Content-Type": input.data.contentType }, body: file });
    if (!res.ok) throw new Error("No se pudo subir el archivo");
    return key;
  }
}
