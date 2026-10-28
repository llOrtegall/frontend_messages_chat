import type { Mock } from "bun:test";

export type Mocked<T> = { [K in keyof T]: T[K] extends (...args: never[]) => unknown ? Mock<T[K]> & T[K] : T[K] };
