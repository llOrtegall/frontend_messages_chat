import { Message, type MessagePrimitive } from "./Message.ts";
import type { UserId } from "../../user/domain/UserId.ts";
import type { MessageId } from "./MessageId.ts";

export type MessageListPrimitive = readonly MessagePrimitive[];

const chronologically = (a: Message, b: Message) => (a.getId().isAfter(b.getId()) ? 1 : b.getId().isAfter(a.getId()) ? -1 : 0);

/** A room's loaded messages, oldest first and each once, whatever order pages and events arrive in. */
export class MessageList {
  private constructor(private readonly messages: readonly Message[]) {}

  static create(messages: readonly Message[]): MessageList {
    const unique = messages.filter((message, index) => messages.findLastIndex((other) => other.equals(message)) === index);
    return new MessageList(unique.sort(chronologically));
  }

  static empty(): MessageList {
    return MessageList.create([]);
  }

  static fromPrimitive(data: MessageListPrimitive): MessageList {
    return MessageList.create(data.map(Message.fromPrimitive));
  }

  /** Adds a message or replaces the stored version of it (an edit). */
  upsert(message: Message): MessageList {
    return MessageList.create([...this.messages, message]);
  }

  /** Adds an older page; what is already loaded wins, as it may be newer than the page. */
  merge(page: MessageList): MessageList {
    return MessageList.create([...page.messages, ...this.messages]);
  }

  remove(id: MessageId): MessageList {
    return MessageList.create(this.messages.filter((message) => !message.getId().equals(id)));
  }

  oldest(): Message | null {
    return this.messages[0] ?? null;
  }

  newest(): Message | null {
    return this.messages.at(-1) ?? null;
  }

  /** The newest message `userId` sent that is not after `upTo`. */
  newestFromUpTo(userId: UserId, upTo: MessageId): Message | null {
    return this.messages.findLast((message) => message.isFrom(userId) && !message.getId().isAfter(upTo)) ?? null;
  }

  map<T>(transform: (message: Message, index: number) => T): T[] {
    return this.messages.map(transform);
  }

  count(): number {
    return this.messages.length;
  }

  isEmpty(): boolean {
    return this.messages.length === 0;
  }

  equals(other: MessageList): boolean {
    return this.count() === other.count() && this.messages.every((message, index) => message.equals(other.messages[index]!));
  }

  toPrimitive(): MessageListPrimitive {
    return this.messages.map((message) => message.toPrimitive());
  }
}
