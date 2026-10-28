import { UserEmail } from "../../user/domain/UserEmail.ts";
import type { AccountRepository } from "../domain/AccountRepository.ts";

export const requestPasswordReset = ({ accountRepository }: { readonly accountRepository: AccountRepository }) =>
  async (email: string): Promise<void> => accountRepository.requestPasswordReset(UserEmail.create(email));
