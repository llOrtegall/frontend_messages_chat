import type { AccountRepository } from "../domain/AccountRepository.ts";
import type { ActiveSessionList } from "../domain/ActiveSessionList.ts";

export const listActiveSessions = ({ accountRepository }: { readonly accountRepository: AccountRepository }) =>
  async (): Promise<ActiveSessionList> => accountRepository.listSessions();
