import { isUuid } from "../../shared/domain/Uuid.ts";
import { InvalidMessageIdError } from "./errors/InvalidMessageIdError.ts";

export type MessageIdPrimitive = string;

/** A UUIDv7: comparing two ids compares when the messages were sent. */
export class MessageId {
  private constructor(private readonly value: string) {}

  static create(value: string): MessageId {
    MessageId.ensureIsUuid(value);
    return new MessageId(value.toLowerCase());
  }

  static fromPrimitive(data: MessageIdPrimitive): MessageId {
    return MessageId.create(data);
  }

  private static ensureIsUuid(value: string): void {
    if (!isUuid(value)) throw new InvalidMessageIdError(value);
  }

  isAfter(other: MessageId): boolean {
    return this.value > other.value;
  }

  equals(other: MessageId): boolean {
    return this.value === other.value;
  }

  toPrimitive(): MessageIdPrimitive {
    return this.value;
  }
}
