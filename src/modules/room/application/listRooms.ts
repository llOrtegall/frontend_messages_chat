import type { ListedRoomList } from "../domain/ListedRoomList.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";

export const listRooms = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async (): Promise<ListedRoomList> => roomRepository.list();
