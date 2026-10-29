import { faker } from "@faker-js/faker";
import { User, type UserPrimitive } from "../../domain/User.ts";
import { UserList } from "../../domain/UserList.ts";

export const createPrimitive = (overrides: Partial<UserPrimitive> = {}): UserPrimitive => ({
  id: faker.string.uuid(),
  displayName: faker.person.firstName(),
  avatarUrl: faker.helpers.arrayElement([faker.image.url(), null]),
  isOnline: faker.datatype.boolean(),
  ...overrides,
});

export const create = (overrides: Partial<UserPrimitive> = {}): User => User.fromPrimitive(createPrimitive(overrides));

export const list = (count: number): UserList => UserList.create(Array.from({ length: count }, () => create()));
