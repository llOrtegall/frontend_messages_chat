import type { AccountRepository } from "../domain/AccountRepository.ts";

export const requestEmailVerification = ({ accountRepository }: { readonly accountRepository: AccountRepository }) =>
  async (): Promise<void> => accountRepository.requestEmailVerification();
