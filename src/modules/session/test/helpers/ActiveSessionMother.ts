import { faker } from "@faker-js/faker";
import { ActiveSession, type ActiveSessionPrimitive } from "../../domain/ActiveSession.ts";

export const CHROME_ON_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
export const FIREFOX_ON_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0";
export const SAFARI_ON_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

export const createPrimitive = (overrides: Partial<ActiveSessionPrimitive> = {}): ActiveSessionPrimitive => {
  const startedAt = faker.date.past();
  return {
    id: faker.string.uuid(),
    userAgent: CHROME_ON_WINDOWS,
    ip: faker.internet.ipv4(),
    startedAt: startedAt.toISOString(),
    lastUsedAt: faker.date.between({ from: startedAt, to: new Date() }).toISOString(),
    current: false,
    ...overrides,
  };
};

export const create = (overrides: Partial<ActiveSessionPrimitive> = {}): ActiveSession => ActiveSession.fromPrimitive(createPrimitive(overrides));

export const current = (): ActiveSession => create({ current: true });

export const usedAt = (lastUsedAt: string): ActiveSession => create({ startedAt: "2026-01-01T00:00:00.000Z", lastUsedAt });
