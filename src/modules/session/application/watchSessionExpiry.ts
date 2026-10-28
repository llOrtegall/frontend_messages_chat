import type { SessionRepository } from "../domain/SessionRepository.ts";

/** Subscribes to the end of the session; returns the unsubscribe. */
export const watchSessionExpiry = ({ sessionRepository }: { readonly sessionRepository: SessionRepository }) =>
  (onExpired: () => void): (() => void) => sessionRepository.onExpired(onExpired);
