import { UserId } from "../../user/domain/UserId.ts";
import type { ListedRoom } from "../domain/ListedRoom.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";

export const openDirectRoom = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async (withUserId: string): Promise<ListedRoom> => roomRepository.openDirect(UserId.fromPrimitive(withUserId));
