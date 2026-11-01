import { InvalidRoomError } from "./errors/InvalidRoomError.ts";

export type MuteDurationPrimitive = "hour" | "eight_hours" | "week" | "until_unmuted";

const HOUR_MS = 60 * 60 * 1000;
const YEAR_MS = 365 * 24 * HOUR_MS;
// The backend takes an end date only: "until unmuted" is one far enough away never to be reached.
const SPANS_MS: Readonly<Record<MuteDurationPrimitive, number>> = {
  hour: HOUR_MS,
  eight_hours: 8 * HOUR_MS,
  week: 7 * 24 * HOUR_MS,
  until_unmuted: 100 * YEAR_MS,
};

/** How long the user silences a room: no badge nor title count meanwhile. */
export class MuteDuration {
  private constructor(private readonly value: MuteDurationPrimitive) {}

  static create(value: string): MuteDuration {
    MuteDuration.ensureIsKnown(value);
    return new MuteDuration(value);
  }

  static fromPrimitive(data: MuteDurationPrimitive): MuteDuration {
    return MuteDuration.create(data);
  }

  static all(): MuteDuration[] {
    return (Object.keys(SPANS_MS) as MuteDurationPrimitive[]).map(MuteDuration.create);
  }

  /** A mute ending more than a year away was set "until unmuted". */
  static isIndefinite(until: Date, now: Date): boolean {
    return until.getTime() - now.getTime() > YEAR_MS;
  }

  private static ensureIsKnown(value: string): asserts value is MuteDurationPrimitive {
    if (!Object.hasOwn(SPANS_MS, value)) throw new InvalidRoomError(`"${value}" is not a mute duration`);
  }

  endsAfter(now: Date): Date {
    return new Date(now.getTime() + SPANS_MS[this.value]);
  }

  equals(other: MuteDuration): boolean {
    return this.value === other.value;
  }

  toPrimitive(): MuteDurationPrimitive {
    return this.value;
  }
}
