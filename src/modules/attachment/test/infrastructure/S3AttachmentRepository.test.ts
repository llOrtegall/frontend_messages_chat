import { afterEach, describe, expect, it } from "bun:test";
import { ATTACHMENT_MAX_BYTES } from "../../../../contracts/index.ts";
import { RequestFailedError } from "../../../shared/domain/errors/RequestFailedError.ts";
import { ApiHttp } from "../../../shared/infrastructure/ApiHttp.ts";
import { AttachmentFile } from "../../domain/AttachmentFile.ts";
import { S3AttachmentRepository } from "../../infrastructure/S3AttachmentRepository.ts";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => {
  server?.stop(true);
  server = null;
});

/** Fake API (presign) and bucket (PUT /bucket/...) on one server. */
const backend = (putStatus = 200) => {
  const calls: { presign?: unknown; put?: { contentType: string | null; size: number } } = {};
  server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/attachments/presign") {
        calls.presign = await request.json();
        return Response.json(
          { url: `${url.origin}/bucket/uploads/u/1.png?sig=1`, key: "uploads/u/1.png", expiresAt: new Date().toISOString(), publicUrl: `${url.origin}/bucket/uploads/u/1.png` },
          { status: 201 },
        );
      }
      calls.put = { contentType: request.headers.get("content-type"), size: (await request.arrayBuffer()).byteLength };
      return new Response(null, { status: putStatus });
    },
  });
  return { calls, repository: new S3AttachmentRepository(new ApiHttp(`http://localhost:${server.port}`)) };
};

describe("S3AttachmentRepository", () => {
  it("presigns with the file's type and size, then PUTs it with that Content-Type", async () => {
    const { calls, repository } = backend();

    const key = await repository.upload(AttachmentFile.create(new Blob(["abc"], { type: "text/plain;charset=utf-8" })));

    expect(key.toPrimitive()).toBe("uploads/u/1.png");
    expect(calls.presign).toEqual({ contentType: "text/plain", sizeBytes: 3 });
    expect(calls.put).toEqual({ contentType: "text/plain", size: 3 });
  });

  it("reports a refused bucket PUT", async () => {
    const { repository } = backend(403);

    const failure = await repository.upload(AttachmentFile.create(new Blob(["abc"], { type: "image/png" }))).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(RequestFailedError);
    expect((failure as RequestFailedError).code).toBe("attachment.upload_failed");
  });

  it("uses the same size limit as the backend", () => {
    expect(AttachmentFile.MAX_BYTES).toBe(ATTACHMENT_MAX_BYTES);
  });
});
