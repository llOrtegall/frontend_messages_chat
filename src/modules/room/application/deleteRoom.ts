import { RoomId } from "../domain/RoomId.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";

export const deleteRoom = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async (roomId: string): Promise<void> => roomRepository.delete(RoomId.fromPrimitive(roomId));
