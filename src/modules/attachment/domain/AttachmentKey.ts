import { InvalidAttachmentKeyError } from "./errors/InvalidAttachmentKeyError.ts";

export type AttachmentKeyPrimitive = string;

/** Where an uploaded file is stored; a message or a profile refers to the file by it. */
export class AttachmentKey {
  private static readonly MAX_LENGTH = 512;

  private constructor(private readonly value: string) {}

  static create(value: string): AttachmentKey {
    AttachmentKey.ensureLengthIsAllowed(value);
    return new AttachmentKey(value);
  }

  static fromPrimitive(data: AttachmentKeyPrimitive): AttachmentKey {
    return AttachmentKey.create(data);
  }

  private static ensureLengthIsAllowed(value: string): void {
    if (value.length === 0 || value.length > AttachmentKey.MAX_LENGTH) {
      throw new InvalidAttachmentKeyError(`it must have between 1 and ${AttachmentKey.MAX_LENGTH} characters`);
    }
  }

  equals(other: AttachmentKey): boolean {
    return this.value === other.value;
  }

  toPrimitive(): AttachmentKeyPrimitive {
    return this.value;
  }
}
