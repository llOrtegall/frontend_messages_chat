import { UserId } from "../../user/domain/UserId.ts";
import type { ListedRoom } from "../domain/ListedRoom.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";
import { RoomName } from "../domain/RoomName.ts";

export interface CreateGroupRoomInput {
  readonly name: string;
  readonly memberIds: readonly string[];
}

export const createGroupRoom = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async ({ name, memberIds }: CreateGroupRoomInput): Promise<ListedRoom> =>
    roomRepository.createGroup(RoomName.create(name), memberIds.map(UserId.fromPrimitive));
