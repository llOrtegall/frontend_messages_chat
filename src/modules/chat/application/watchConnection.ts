import type { ConnectionStatus } from "../../realtime/domain/ConnectionStatus.ts";
import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";

/** Subscribes to the state of the realtime channel; returns the unsubscribe. */
export const watchConnection = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  (onChange: (status: ConnectionStatus) => void): (() => void) => realtimeRepository.onStatus(onChange);
