import type { Message } from "../../message/domain/Message.ts";
import type { MessageId } from "../../message/domain/MessageId.ts";
import { MessageList } from "../../message/domain/MessageList.ts";

/** The messages loaded for one room and whether older ones remain on the server. */
export class RoomHistory {
  private constructor(
    private readonly messages: MessageList,
    private readonly loading: boolean,
    private readonly more: boolean,
  ) {}

  static create(messages: MessageList, isLoading: boolean, hasMore: boolean): RoomHistory {
    return new RoomHistory(messages, isLoading, hasMore);
  }

  static empty(): RoomHistory {
    return RoomHistory.create(MessageList.empty(), false, true);
  }

  getMessages(): MessageList {
    return this.messages;
  }

  isLoading(): boolean {
    return this.loading;
  }

  hasMore(): boolean {
    return this.more;
  }

  canLoadOlder(): boolean {
    return !this.loading && this.more;
  }

  loadingStarted(): RoomHistory {
    return RoomHistory.create(this.messages, true, this.more);
  }

  /** An older page: a page shorter than asked for means the start of the room was reached. */
  olderPageLoaded(page: MessageList, pageSize: number): RoomHistory {
    return RoomHistory.create(this.messages.merge(page), false, page.count() === pageSize);
  }

  /** The newest page again (after a reconnect): it fills the gap without touching how far back the user went. */
  newestPageLoaded(page: MessageList): RoomHistory {
    return RoomHistory.create(this.messages.merge(page), false, this.more);
  }

  loadingFailed(): RoomHistory {
    return RoomHistory.create(this.messages, false, this.more);
  }

  withMessage(message: Message): RoomHistory {
    return RoomHistory.create(this.messages.upsert(message), this.loading, this.more);
  }

  withoutMessage(messageId: MessageId): RoomHistory {
    return RoomHistory.create(this.messages.remove(messageId), this.loading, this.more);
  }

  equals(other: RoomHistory): boolean {
    return this.messages.equals(other.messages) && this.loading === other.loading && this.more === other.more;
  }
}
