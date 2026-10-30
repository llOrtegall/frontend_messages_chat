import { isUuid } from "../../shared/domain/Uuid.ts";
import { InvalidMessageError } from "./errors/InvalidMessageError.ts";

export type ClientMessageIdPrimitive = string;

/** Chosen by this app for each message it sends, so a retried send is stored only once. */
export class ClientMessageId {
  private constructor(private readonly value: string) {}

  static create(value: string): ClientMessageId {
    ClientMessageId.ensureIsUuid(value);
    return new ClientMessageId(value);
  }

  static generate(): ClientMessageId {
    return ClientMessageId.create(crypto.randomUUID());
  }

  static fromPrimitive(data: ClientMessageIdPrimitive): ClientMessageId {
    return ClientMessageId.create(data);
  }

  private static ensureIsUuid(value: string): void {
    if (!isUuid(value)) throw new InvalidMessageError(`"${value}" is not a client message id`);
  }

  equals(other: ClientMessageId): boolean {
    return this.value === other.value;
  }

  toPrimitive(): ClientMessageIdPrimitive {
    return this.value;
  }
}
