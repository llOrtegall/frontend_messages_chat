import type { RoomId } from "../../room/domain/RoomId.ts";
import type { ClientMessageId } from "./ClientMessageId.ts";
import { InvalidMessageError } from "./errors/InvalidMessageError.ts";
import { OutgoingMessage, type OutgoingMessagePrimitive } from "./OutgoingMessage.ts";

export type OutgoingMessageListPrimitive = readonly OutgoingMessagePrimitive[];

/** The messages still on their way, in the order the user sent them. */
export class OutgoingMessageList {
  private constructor(private readonly messages: readonly OutgoingMessage[]) {}

  static create(messages: readonly OutgoingMessage[]): OutgoingMessageList {
    OutgoingMessageList.ensureHasNoDuplicates(messages);
    return new OutgoingMessageList([...messages]);
  }

  static empty(): OutgoingMessageList {
    return OutgoingMessageList.create([]);
  }

  static fromPrimitive(data: OutgoingMessageListPrimitive): OutgoingMessageList {
    return OutgoingMessageList.create(data.map(OutgoingMessage.fromPrimitive));
  }

  private static ensureHasNoDuplicates(messages: readonly OutgoingMessage[]): void {
    if (messages.some((message, index) => messages.findIndex((other) => other.equals(message)) !== index)) {
      throw new InvalidMessageError("the same message is on its way twice");
    }
  }

  find(id: ClientMessageId): OutgoingMessage | null {
    return this.messages.find((message) => message.getId().equals(id)) ?? null;
  }

  /** Replaces the message where it was, or adds it at the end. */
  upsert(message: OutgoingMessage): OutgoingMessageList {
    const isKnown = this.messages.some((other) => other.equals(message));
    return OutgoingMessageList.create(isKnown ? this.messages.map((other) => (other.equals(message) ? message : other)) : [...this.messages, message]);
  }

  /** Changes one message; does nothing when it is not on its way any more. */
  update(id: ClientMessageId, change: (message: OutgoingMessage) => OutgoingMessage): OutgoingMessageList {
    return OutgoingMessageList.create(this.messages.map((message) => (message.getId().equals(id) ? change(message) : message)));
  }

  remove(id: ClientMessageId): OutgoingMessageList {
    return OutgoingMessageList.create(this.messages.filter((message) => !message.getId().equals(id)));
  }

  inRoom(roomId: RoomId): OutgoingMessageList {
    return OutgoingMessageList.create(this.messages.filter((message) => message.isIn(roomId)));
  }

  withoutRoom(roomId: RoomId): OutgoingMessageList {
    return OutgoingMessageList.create(this.messages.filter((message) => !message.isIn(roomId)));
  }

  failed(): OutgoingMessageList {
    return OutgoingMessageList.create(this.messages.filter((message) => message.hasFailed()));
  }

  isEmpty(): boolean {
    return this.messages.length === 0;
  }

  count(): number {
    return this.messages.length;
  }

  map<T>(transform: (message: OutgoingMessage) => T): T[] {
    return this.messages.map(transform);
  }

  equals(other: OutgoingMessageList): boolean {
    return this.count() === other.count() && this.messages.every((message, index) => message.equals(other.messages[index]!));
  }

  toPrimitive(): OutgoingMessageListPrimitive {
    return this.messages.map((message) => message.toPrimitive());
  }
}
