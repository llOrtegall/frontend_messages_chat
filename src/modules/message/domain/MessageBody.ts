import { InvalidMessageError } from "./errors/InvalidMessageError.ts";

export type MessageBodyPrimitive = string;

/** The text of a message; empty only when the message carries a file. */
export class MessageBody {
  static readonly MAX_LENGTH = 4096;

  private constructor(private readonly value: string) {}

  static create(value: string): MessageBody {
    MessageBody.ensureIsNotTooLong(value);
    return new MessageBody(value);
  }

  static fromPrimitive(data: MessageBodyPrimitive): MessageBody {
    return MessageBody.create(data);
  }

  private static ensureIsNotTooLong(value: string): void {
    if (value.length > MessageBody.MAX_LENGTH) throw new InvalidMessageError(`the text cannot exceed ${MessageBody.MAX_LENGTH} characters`);
  }

  isEmpty(): boolean {
    return this.value.length === 0;
  }

  equals(other: MessageBody): boolean {
    return this.value === other.value;
  }

  toPrimitive(): MessageBodyPrimitive {
    return this.value;
  }
}
