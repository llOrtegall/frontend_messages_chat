import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";
import { RoomId } from "../../room/domain/RoomId.ts";

/** Receives the events of exactly these rooms from now on, across reconnects. */
export const followRooms = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  (roomIds: readonly string[]): void => realtimeRepository.watchRooms(roomIds.map(RoomId.fromPrimitive));
