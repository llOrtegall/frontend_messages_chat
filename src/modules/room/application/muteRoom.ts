import { MuteDuration } from "../domain/MuteDuration.ts";
import { RoomId } from "../domain/RoomId.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";

export interface MuteRoomInput {
  readonly roomId: string;
  readonly duration: string;
}

/** Silences the room for the user from now on; answers until when. */
export const muteRoom = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async ({ roomId, duration }: MuteRoomInput): Promise<Date | null> =>
    roomRepository.mute(RoomId.fromPrimitive(roomId), MuteDuration.create(duration).endsAfter(new Date()));
