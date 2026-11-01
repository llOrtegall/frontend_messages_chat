import { ActiveSessionId, type ActiveSessionIdPrimitive } from "./ActiveSessionId.ts";
import { InvalidActiveSessionError } from "./errors/InvalidActiveSessionError.ts";

export interface ActiveSessionPrimitive {
  readonly id: ActiveSessionIdPrimitive;
  readonly userAgent: string | null;
  readonly ip: string | null;
  readonly startedAt: string;
  readonly lastUsedAt: string;
  readonly current: boolean;
}

interface ActiveSessionAttributes {
  readonly id: ActiveSessionId;
  readonly userAgent: string | null;
  readonly ip: string | null;
  readonly startedAt: Date;
  readonly lastUsedAt: Date;
  readonly isCurrent: boolean;
}

// Order matters: Edge and Opera also say "Chrome", Chrome also says "Safari", Android also says "Linux".
const BROWSERS: readonly [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];
const SYSTEMS: readonly [RegExp, string][] = [
  [/Android/, "Android"],
  [/iPhone|iPad/, "iOS"],
  [/Windows/, "Windows"],
  [/Mac OS X/, "macOS"],
  [/Linux/, "Linux"],
];

const firstMatch = (userAgent: string | null, names: readonly [RegExp, string][]): string | null =>
  userAgent === null ? null : (names.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null);

/** A device the user is signed in with. */
export class ActiveSession {
  private constructor(private readonly attributes: ActiveSessionAttributes) {}

  static create(attributes: ActiveSessionAttributes): ActiveSession {
    ActiveSession.ensureWasUsedAfterStarting(attributes.startedAt, attributes.lastUsedAt);
    return new ActiveSession({ ...attributes });
  }

  static fromPrimitive(data: ActiveSessionPrimitive): ActiveSession {
    return ActiveSession.create({
      id: ActiveSessionId.fromPrimitive(data.id),
      userAgent: data.userAgent,
      ip: data.ip,
      startedAt: new Date(data.startedAt),
      lastUsedAt: new Date(data.lastUsedAt),
      isCurrent: data.current,
    });
  }

  private static ensureWasUsedAfterStarting(startedAt: Date, lastUsedAt: Date): void {
    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(lastUsedAt.getTime())) throw new InvalidActiveSessionError("its dates are not valid");
    if (lastUsedAt < startedAt) throw new InvalidActiveSessionError("it was last used before it started");
  }

  getId(): ActiveSessionId {
    return this.attributes.id;
  }

  getIp(): string | null {
    return this.attributes.ip;
  }

  getLastUsedAt(): Date {
    return this.attributes.lastUsedAt;
  }

  isCurrent(): boolean {
    return this.attributes.isCurrent;
  }

  /** This device signs out with "Cerrar sesión"; the list only ends the others. */
  canBeEndedFromHere(): boolean {
    return !this.attributes.isCurrent;
  }

  browserName(): string | null {
    return firstMatch(this.attributes.userAgent, BROWSERS);
  }

  systemName(): string | null {
    return firstMatch(this.attributes.userAgent, SYSTEMS);
  }

  equals(other: ActiveSession): boolean {
    return this.attributes.id.equals(other.attributes.id);
  }

  toPrimitive(): ActiveSessionPrimitive {
    const { id, userAgent, ip, startedAt, lastUsedAt, isCurrent } = this.attributes;
    return { id: id.toPrimitive(), userAgent, ip, startedAt: startedAt.toISOString(), lastUsedAt: lastUsedAt.toISOString(), current: isCurrent };
  }
}
