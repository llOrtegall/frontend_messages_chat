import { faker } from "@faker-js/faker";
import { UserId } from "../../domain/UserId.ts";

export const create = (value: string = faker.string.uuid()): UserId => UserId.create(value);
