import type { CurrentUser } from "../domain/CurrentUser.ts";
import type { SessionRepository } from "../domain/SessionRepository.ts";

export const restoreSession = ({ sessionRepository }: { readonly sessionRepository: SessionRepository }) =>
  async (): Promise<CurrentUser | null> => sessionRepository.restore();
