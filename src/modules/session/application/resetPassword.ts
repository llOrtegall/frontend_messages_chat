import type { AccountRepository } from "../domain/AccountRepository.ts";
import { EmailToken } from "../domain/EmailToken.ts";
import { Password } from "../domain/Password.ts";

export const resetPassword = ({ accountRepository }: { readonly accountRepository: AccountRepository }) =>
  async (token: string, newPassword: string): Promise<void> =>
    accountRepository.resetPassword(EmailToken.create(token), Password.create(newPassword));
