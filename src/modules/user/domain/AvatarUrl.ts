import { InvalidAvatarUrlError } from "./errors/InvalidAvatarUrlError.ts";

export type AvatarUrlPrimitive = string;

/** Where a profile picture is served from; the backend derives it from the uploaded image. */
export class AvatarUrl {
  private static readonly PROTOCOLS = ["http:", "https:"];

  private constructor(private readonly value: string) {}

  static create(value: string): AvatarUrl {
    AvatarUrl.ensureIsWebAddress(value);
    return new AvatarUrl(value);
  }

  static fromPrimitive(data: AvatarUrlPrimitive): AvatarUrl {
    return AvatarUrl.create(data);
  }

  private static ensureIsWebAddress(value: string): void {
    if (!URL.canParse(value) || !AvatarUrl.PROTOCOLS.includes(new URL(value).protocol)) throw new InvalidAvatarUrlError(value);
  }

  equals(other: AvatarUrl): boolean {
    return this.value === other.value;
  }

  toPrimitive(): AvatarUrlPrimitive {
    return this.value;
  }
}
