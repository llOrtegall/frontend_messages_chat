import type { AccountRepository } from "../domain/AccountRepository.ts";
import { EmailToken } from "../domain/EmailToken.ts";

export const confirmEmailVerification = ({ accountRepository }: { readonly accountRepository: AccountRepository }) =>
  async (token: string): Promise<void> => accountRepository.confirmEmailVerification(EmailToken.create(token));
