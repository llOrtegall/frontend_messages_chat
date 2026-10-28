import { describe, expect, it } from "bun:test";
import { uploadAttachment } from "../../application/uploadAttachment.ts";
import { EmptyAttachmentError } from "../../domain/errors/EmptyAttachmentError.ts";
import * as AttachmentMother from "../helpers/AttachmentMother.ts";
import * as AttachmentRepositoryMother from "../helpers/AttachmentRepositoryMother.ts";

describe("uploadAttachment", () => {
  it("uploads a valid file and returns where it is stored", async () => {
    const attachmentRepository = AttachmentRepositoryMother.create();
    const content = AttachmentMother.content("application/pdf");

    const key = await uploadAttachment({ attachmentRepository })(content);

    const [uploaded] = attachmentRepository.upload.mock.calls[0]!;
    expect(uploaded.toPrimitive()).toBe(content);
    expect(key.toPrimitive()).toStartWith("uploads/");
  });

  it("uploads nothing when the file is not acceptable", async () => {
    const attachmentRepository = AttachmentRepositoryMother.create();

    await expect(uploadAttachment({ attachmentRepository })(new Blob([], { type: "image/png" }))).rejects.toThrow(EmptyAttachmentError);
    expect(attachmentRepository.upload).not.toHaveBeenCalled();
  });
});
