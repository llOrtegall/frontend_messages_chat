import type { Room } from "../domain/Room.ts";
import { RoomId } from "../domain/RoomId.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";

export const findRoom = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async (roomId: string): Promise<Room> => roomRepository.find(RoomId.fromPrimitive(roomId));
