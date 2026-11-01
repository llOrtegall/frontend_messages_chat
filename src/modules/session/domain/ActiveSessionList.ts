import { ActiveSession, type ActiveSessionPrimitive } from "./ActiveSession.ts";
import type { ActiveSessionId } from "./ActiveSessionId.ts";
import { InvalidActiveSessionError } from "./errors/InvalidActiveSessionError.ts";

export type ActiveSessionListPrimitive = readonly ActiveSessionPrimitive[];

/** The devices the user is signed in with, this one first, then the most recently used. */
export class ActiveSessionList {
  private constructor(private readonly sessions: readonly ActiveSession[]) {}

  static create(sessions: readonly ActiveSession[]): ActiveSessionList {
    ActiveSessionList.ensureHasNoDuplicates(sessions);
    const byRecency = [...sessions].sort((a, b) => b.getLastUsedAt().getTime() - a.getLastUsedAt().getTime());
    return new ActiveSessionList([...byRecency.filter((session) => session.isCurrent()), ...byRecency.filter((session) => !session.isCurrent())]);
  }

  static empty(): ActiveSessionList {
    return ActiveSessionList.create([]);
  }

  static fromPrimitive(data: ActiveSessionListPrimitive): ActiveSessionList {
    return ActiveSessionList.create(data.map(ActiveSession.fromPrimitive));
  }

  private static ensureHasNoDuplicates(sessions: readonly ActiveSession[]): void {
    if (sessions.some((session, index) => sessions.findIndex((other) => other.equals(session)) !== index)) {
      throw new InvalidActiveSessionError("the same session is listed twice");
    }
  }

  without(id: ActiveSessionId): ActiveSessionList {
    return ActiveSessionList.create(this.sessions.filter((session) => !session.getId().equals(id)));
  }

  count(): number {
    return this.sessions.length;
  }

  isEmpty(): boolean {
    return this.sessions.length === 0;
  }

  map<T>(transform: (session: ActiveSession) => T): T[] {
    return this.sessions.map(transform);
  }

  equals(other: ActiveSessionList): boolean {
    return this.count() === other.count() && this.sessions.every((session, index) => session.equals(other.sessions[index]!));
  }

  toPrimitive(): ActiveSessionListPrimitive {
    return this.sessions.map((session) => session.toPrimitive());
  }
}
