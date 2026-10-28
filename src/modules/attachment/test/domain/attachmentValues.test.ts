import { describe, expect, it } from "bun:test";
import { AttachmentContentType } from "../../domain/AttachmentContentType.ts";
import { AttachmentFile } from "../../domain/AttachmentFile.ts";
import { AttachmentKey } from "../../domain/AttachmentKey.ts";
import { AttachmentTooLargeError } from "../../domain/errors/AttachmentTooLargeError.ts";
import { AttachmentTypeNotAllowedError } from "../../domain/errors/AttachmentTypeNotAllowedError.ts";
import { EmptyAttachmentError } from "../../domain/errors/EmptyAttachmentError.ts";
import { InvalidAttachmentKeyError } from "../../domain/errors/InvalidAttachmentKeyError.ts";
import * as AttachmentMother from "../helpers/AttachmentMother.ts";

describe("AttachmentContentType", () => {
  it("keeps the essence of a full MIME type", () => {
    expect(AttachmentContentType.create("Text/Plain; charset=utf-8").toPrimitive()).toBe("text/plain");
  });

  it.each(["image/svg+xml", "text/html", "application/octet-stream", ""])("refuses %p", (type) => {
    expect(() => AttachmentContentType.create(type)).toThrow(AttachmentTypeNotAllowedError);
  });

  it("tells images apart and lists what file pickers accept", () => {
    expect(AttachmentContentType.create("image/webp").isImage()).toBe(true);
    expect(AttachmentContentType.create("application/pdf").isImage()).toBe(false);
    expect(AttachmentContentType.acceptedForAvatars()).toBe("image/jpeg,image/png,image/webp,image/gif");
    expect(AttachmentContentType.acceptedForAttachments()).toContain("application/pdf");
  });
});

describe("AttachmentFile", () => {
  it("reads type and size from the picked file", () => {
    const content = AttachmentMother.content("image/png", "abc");

    const file = AttachmentFile.create(content);

    expect(file.getContentType().toPrimitive()).toBe("image/png");
    expect(file.getSizeBytes()).toBe(3);
    expect(file.toPrimitive()).toBe(content);
  });

  it("refuses an empty file, a file over the limit and a type not allowed", () => {
    const tooLarge = { size: AttachmentFile.MAX_BYTES + 1, type: "image/png" } as Blob;

    expect(() => AttachmentFile.create(new Blob([], { type: "image/png" }))).toThrow(EmptyAttachmentError);
    expect(() => AttachmentFile.create(tooLarge)).toThrow(AttachmentTooLargeError);
    expect(() => AttachmentFile.create(AttachmentMother.content("image/svg+xml"))).toThrow(AttachmentTypeNotAllowedError);
  });
});

describe("AttachmentKey", () => {
  it("survives a primitive round-trip", () => {
    const key = AttachmentMother.key();

    expect(AttachmentKey.fromPrimitive(key.toPrimitive()).equals(key)).toBe(true);
  });

  it.each(["", "k".repeat(513)])("rejects a key of length %#", (value) => {
    expect(() => AttachmentKey.create(value)).toThrow(InvalidAttachmentKeyError);
  });
});
