import { describe, test, expect, afterEach } from "bun:test";
import { HttpClient } from "../../src/infrastructure/http/http-client.ts";
import { S3AttachmentUploader } from "../../src/infrastructure/http/attachment-uploader.ts";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => { server?.stop(true); server = null; });

/** Fake API (presign) and bucket (PUT /bucket/...) on one server. */
function backend(putStatus = 200) {
  const calls: { presign?: unknown; put?: { contentType: string | null; size: number } } = {};
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/api/v1/attachments/presign") {
        calls.presign = await req.json();
        return Response.json({
          url: `${url.origin}/bucket/uploads/u/1.png?sig=1`,
          key: "uploads/u/1.png",
          expiresAt: new Date().toISOString(),
          publicUrl: `${url.origin}/bucket/uploads/u/1.png`,
        }, { status: 201 });
      }
      calls.put = { contentType: req.headers.get("content-type"), size: (await req.arrayBuffer()).byteLength };
      return new Response(null, { status: putStatus });
    },
  });
  return { calls, uploader: new S3AttachmentUploader(new HttpClient(`http://localhost:${server.port}`)) };
}

describe("S3AttachmentUploader", () => {
  test("presigns with the file's type and size, then PUTs it with that Content-Type", async () => {
    const { calls, uploader } = backend();
    const key = await uploader.upload(new Blob(["abc"], { type: "image/png" }));
    expect(key).toBe("uploads/u/1.png");
    expect(calls.presign).toEqual({ contentType: "image/png", sizeBytes: 3 });
    expect(calls.put).toEqual({ contentType: "image/png", size: 3 });
  });

  test("refuses disallowed types before touching the network", async () => {
    const { calls, uploader } = backend();
    await expect(uploader.upload(new Blob(["<svg/>"], { type: "image/svg+xml" }))).rejects.toThrow("Tipo de archivo no permitido");
    await expect(uploader.upload(new Blob([], { type: "image/png" }))).rejects.toThrow("vacío");
    expect(calls.presign).toBeUndefined();
  });

  test("a failed bucket PUT is an error", async () => {
    const { calls, uploader } = backend(403);
    await expect(uploader.upload(new Blob(["abc"], { type: "text/plain;charset=utf-8" }))).rejects.toThrow("No se pudo subir el archivo");
    expect(calls.put?.contentType).toBe("text/plain");
  });
});
