import { faker } from "@faker-js/faker";
import { CurrentUser, type CurrentUserPrimitive } from "../../domain/CurrentUser.ts";

export const createPrimitive = (overrides: Partial<CurrentUserPrimitive> = {}): CurrentUserPrimitive => ({
  id: faker.string.uuid(),
  email: faker.internet.email().toLowerCase(),
  displayName: faker.person.firstName(),
  avatarUrl: faker.image.url(),
  emailVerifiedAt: faker.date.past().toISOString(),
  ...overrides,
});

export const create = (overrides: Partial<CurrentUserPrimitive> = {}): CurrentUser => CurrentUser.fromPrimitive(createPrimitive(overrides));

export const unverified = (): CurrentUser => create({ emailVerifiedAt: null });

export const withoutPicture = (): CurrentUser => create({ avatarUrl: null });
