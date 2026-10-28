import { isUuid } from "../../shared/domain/Uuid.ts";
import { InvalidUserIdError } from "./errors/InvalidUserIdError.ts";

export type UserIdPrimitive = string;

export class UserId {
  private constructor(private readonly value: string) {}

  static create(value: string): UserId {
    UserId.ensureIsUuid(value);
    return new UserId(value);
  }

  static fromPrimitive(data: UserIdPrimitive): UserId {
    return UserId.create(data);
  }

  private static ensureIsUuid(value: string): void {
    if (!isUuid(value)) throw new InvalidUserIdError(value);
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toPrimitive(): UserIdPrimitive {
    return this.value;
  }
}
