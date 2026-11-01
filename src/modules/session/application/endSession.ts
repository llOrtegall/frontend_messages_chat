import type { AccountRepository } from "../domain/AccountRepository.ts";
import { ActiveSessionId } from "../domain/ActiveSessionId.ts";

/** Signs that device out: it can't renew its access any more. */
export const endSession = ({ accountRepository }: { readonly accountRepository: AccountRepository }) =>
  async (sessionId: string): Promise<void> => accountRepository.endSession(ActiveSessionId.fromPrimitive(sessionId));
