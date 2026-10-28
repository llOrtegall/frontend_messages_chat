import { faker } from "@faker-js/faker";
import { AttachmentFile } from "../../domain/AttachmentFile.ts";
import { AttachmentKey } from "../../domain/AttachmentKey.ts";

export const content = (type = "image/png", body: string = faker.lorem.word()): Blob => new Blob([body], { type });

export const file = (type = "image/png"): AttachmentFile => AttachmentFile.create(content(type));

export const key = (): AttachmentKey => AttachmentKey.create(`uploads/${faker.string.uuid()}/${faker.string.uuid()}.png`);
