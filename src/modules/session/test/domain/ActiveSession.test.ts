import { describe, expect, it } from "bun:test";
import { ActiveSession } from "../../domain/ActiveSession.ts";
import { ActiveSessionId } from "../../domain/ActiveSessionId.ts";
import { ActiveSessionList } from "../../domain/ActiveSessionList.ts";
import { InvalidActiveSessionError } from "../../domain/errors/InvalidActiveSessionError.ts";
import * as ActiveSessionMother from "../helpers/ActiveSessionMother.ts";

describe("ActiveSession", () => {
  it("survives a primitive round-trip", () => {
    const primitive = ActiveSessionMother.createPrimitive();

    expect(ActiveSession.fromPrimitive(primitive).toPrimitive()).toEqual(primitive);
  });

  it("rejects an id that is not a uuid, unreadable dates, and a last use before it started", () => {
    expect(() => ActiveSessionId.create("s1")).toThrow(InvalidActiveSessionError);
    expect(() => ActiveSessionMother.create({ startedAt: "yesterday" })).toThrow(InvalidActiveSessionError);
    expect(() => ActiveSessionMother.create({ startedAt: "2026-11-02T00:00:00.000Z", lastUsedAt: "2026-11-01T00:00:00.000Z" })).toThrow(InvalidActiveSessionError);
  });

  it("can end any device but this one from the list", () => {
    expect(ActiveSessionMother.create().canBeEndedFromHere()).toBe(true);
    expect(ActiveSessionMother.current().canBeEndedFromHere()).toBe(false);
  });

  it("names the browser and system it was signed in from, when it can tell", () => {
    const named = (userAgent: string | null) => {
      const session = ActiveSessionMother.create({ userAgent });
      return [session.browserName(), session.systemName()];
    };

    expect(named(ActiveSessionMother.CHROME_ON_WINDOWS)).toEqual(["Chrome", "Windows"]);
    expect(named(ActiveSessionMother.FIREFOX_ON_LINUX)).toEqual(["Firefox", "Linux"]);
    expect(named(ActiveSessionMother.SAFARI_ON_IPHONE)).toEqual(["Safari", "iOS"]);
    expect(named("curl/8.0")).toEqual([null, null]);
    expect(named(null)).toEqual([null, null]);
  });
});

describe("ActiveSessionList", () => {
  it("lists this device first, then the most recently used", () => {
    const [old, recent, current] = [ActiveSessionMother.usedAt("2026-11-01T00:00:00.000Z"), ActiveSessionMother.usedAt("2026-11-10T00:00:00.000Z"), ActiveSessionMother.current()];

    const list = ActiveSessionList.create([old, current, recent]);

    expect(list.map((session) => session.getId())).toEqual([current.getId(), recent.getId(), old.getId()]);
  });

  it("drops an ended session into a new list", () => {
    const [kept, ended] = [ActiveSessionMother.create(), ActiveSessionMother.create()];
    const list = ActiveSessionList.create([kept, ended]);

    const remaining = list.without(ended.getId());

    expect(remaining.map((session) => session.getId())).toEqual([kept.getId()]);
    expect(list.count()).toBe(2);
  });

  it("rejects the same session twice and survives a primitive round-trip", () => {
    const session = ActiveSessionMother.create();

    expect(() => ActiveSessionList.create([session, session])).toThrow(InvalidActiveSessionError);
    const list = ActiveSessionList.create([session, ActiveSessionMother.current()]);
    expect(ActiveSessionList.fromPrimitive(list.toPrimitive()).equals(list)).toBe(true);
  });
});
