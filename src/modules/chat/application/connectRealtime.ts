import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";

export const connectRealtime = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  (): void => realtimeRepository.connect();
