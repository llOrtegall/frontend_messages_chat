import type { SessionRepository } from "../domain/SessionRepository.ts";

export const signOut = ({ sessionRepository }: { readonly sessionRepository: SessionRepository }) =>
  async (): Promise<void> => sessionRepository.signOut();
