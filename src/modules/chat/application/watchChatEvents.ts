import type { ChatEvent } from "../../realtime/domain/ChatEvent.ts";
import type { RealtimeRepository } from "../../realtime/domain/RealtimeRepository.ts";

/** Subscribes to the realtime events; returns the unsubscribe. */
export const watchChatEvents = ({ realtimeRepository }: { readonly realtimeRepository: RealtimeRepository }) =>
  (onEvent: (event: ChatEvent) => void): (() => void) => realtimeRepository.onEvent(onEvent);
