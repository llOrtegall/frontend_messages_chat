import { RoomId } from "../domain/RoomId.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";

export const unmuteRoom = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async (roomId: string): Promise<void> => {
    await roomRepository.mute(RoomId.fromPrimitive(roomId), null);
  };
