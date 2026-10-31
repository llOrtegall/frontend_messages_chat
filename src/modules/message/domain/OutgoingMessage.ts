import type { RoomId } from "../../room/domain/RoomId.ts";
import type { ClientMessageId } from "./ClientMessageId.ts";
import { InvalidMessageError } from "./errors/InvalidMessageError.ts";
import { MessageDraft, type MessageDraftPrimitive } from "./MessageDraft.ts";

export type DeliveryStatus = "sending" | "failed";

const DELIVERY_STATUSES: readonly string[] = ["sending", "failed"] satisfies DeliveryStatus[];

export interface OutgoingMessagePrimitive {
  readonly draft: MessageDraftPrimitive;
  readonly status: DeliveryStatus;
}

/** A message the user sent that the backend hasn't confirmed yet; retried with the same client id. */
export class OutgoingMessage {
  private constructor(
    private readonly draft: MessageDraft,
    private readonly status: DeliveryStatus,
  ) {}

  static create(draft: MessageDraft, status: DeliveryStatus): OutgoingMessage {
    OutgoingMessage.ensureStatusIsKnown(status);
    return new OutgoingMessage(draft, status);
  }

  static sending(draft: MessageDraft): OutgoingMessage {
    return OutgoingMessage.create(draft, "sending");
  }

  static fromPrimitive(data: OutgoingMessagePrimitive): OutgoingMessage {
    return OutgoingMessage.create(MessageDraft.fromPrimitive(data.draft), data.status);
  }

  private static ensureStatusIsKnown(status: string): void {
    if (!DELIVERY_STATUSES.includes(status)) throw new InvalidMessageError(`"${status}" is not a delivery status`);
  }

  getId(): ClientMessageId {
    return this.draft.getClientMessageId();
  }

  getDraft(): MessageDraft {
    return this.draft;
  }

  isIn(roomId: RoomId): boolean {
    return this.draft.getRoomId().equals(roomId);
  }

  hasFailed(): boolean {
    return this.status === "failed";
  }

  failed(): OutgoingMessage {
    return OutgoingMessage.create(this.draft, "failed");
  }

  equals(other: OutgoingMessage): boolean {
    return this.getId().equals(other.getId());
  }

  toPrimitive(): OutgoingMessagePrimitive {
    return { draft: this.draft.toPrimitive(), status: this.status };
  }
}
