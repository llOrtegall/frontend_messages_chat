import { mock } from "bun:test";
import type { Mocked } from "../../../shared/test/helpers/Mocked.ts";
import { ListedRoomList } from "../../domain/ListedRoomList.ts";
import { Room } from "../../domain/Room.ts";
import { RoomMember } from "../../domain/RoomMember.ts";
import type { RoomRepository } from "../../domain/RoomRepository.ts";
import * as RoomMother from "./RoomMother.ts";

export const create = (overrides: Partial<RoomRepository> = {}): Mocked<RoomRepository> =>
  ({
    list: mock(async () => ListedRoomList.empty()),
    find: mock(async () => Room.fromPrimitive(RoomMother.createPrimitive())),
    openDirect: mock(async () => RoomMother.listed({ kind: "dm", name: null })),
    createGroup: mock(async () => RoomMother.listed()),
    delete: mock(async () => {}),
    addMember: mock(async () => RoomMember.fromPrimitive(RoomMother.memberPrimitive())),
    removeMember: mock(async () => {}),
    changeRole: mock(async () => RoomMember.fromPrimitive(RoomMother.memberPrimitive({ role: "admin" }))),
    ...overrides,
  }) as Mocked<RoomRepository>;
