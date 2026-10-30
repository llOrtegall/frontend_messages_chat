import { describe, expect, it } from "bun:test";
import { AttachmentMeta } from "../../domain/AttachmentMeta.ts";
import { InvalidAttachmentMetaError } from "../../domain/errors/InvalidAttachmentMetaError.ts";

const meta = { url: "https://cdn.example.com/uploads/u/informe%20final.pdf", contentType: "application/pdf" as const, sizeBytes: 2048 };

describe("AttachmentMeta", () => {
  it("survives a primitive round-trip", () => {
    expect(AttachmentMeta.fromPrimitive(meta).toPrimitive()).toEqual(meta);
  });

  it("is named after the last part of its address and tells images apart", () => {
    expect(AttachmentMeta.fromPrimitive(meta).fileName()).toBe("informe final.pdf");
    expect(AttachmentMeta.fromPrimitive(meta).isImage()).toBe(false);
    expect(AttachmentMeta.fromPrimitive({ ...meta, contentType: "image/gif" }).isImage()).toBe(true);
  });

  it("rejects an address that is not on the web and an impossible size", () => {
    expect(() => AttachmentMeta.fromPrimitive({ ...meta, url: "javascript:alert(1)" })).toThrow(InvalidAttachmentMetaError);
    expect(() => AttachmentMeta.fromPrimitive({ ...meta, sizeBytes: 0 })).toThrow(InvalidAttachmentMetaError);
  });
});
