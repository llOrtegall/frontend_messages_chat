import { isUuid } from "../../shared/domain/Uuid.ts";
import { InvalidActiveSessionError } from "./errors/InvalidActiveSessionError.ts";

export type ActiveSessionIdPrimitive = string;

export class ActiveSessionId {
  private constructor(private readonly value: string) {}

  static create(value: string): ActiveSessionId {
    ActiveSessionId.ensureIsUuid(value);
    return new ActiveSessionId(value);
  }

  static fromPrimitive(data: ActiveSessionIdPrimitive): ActiveSessionId {
    return ActiveSessionId.create(data);
  }

  private static ensureIsUuid(value: string): void {
    if (!isUuid(value)) throw new InvalidActiveSessionError(`"${value}" is not a session id`);
  }

  equals(other: ActiveSessionId): boolean {
    return this.value === other.value;
  }

  toPrimitive(): ActiveSessionIdPrimitive {
    return this.value;
  }
}
