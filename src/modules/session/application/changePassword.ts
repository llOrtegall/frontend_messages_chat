import type { AccountRepository } from "../domain/AccountRepository.ts";
import { Password } from "../domain/Password.ts";

export interface ChangePasswordInput {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export const changePassword = ({ accountRepository }: { readonly accountRepository: AccountRepository }) =>
  async ({ currentPassword, newPassword }: ChangePasswordInput): Promise<void> =>
    accountRepository.changePassword(currentPassword, Password.create(newPassword));
