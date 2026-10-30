import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";

export const disconnectRealtime = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  (): void => realtimeRepository.disconnect();
