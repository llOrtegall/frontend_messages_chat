import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";
import { RoomId } from "../../room/domain/RoomId.ts";

export const notifyTyping = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  (roomId: string): void => realtimeRepository.notifyTyping(RoomId.fromPrimitive(roomId));
