import { UserEmail } from "../../user/domain/UserEmail.ts";
import type { CurrentUser } from "../domain/CurrentUser.ts";
import type { SessionRepository } from "../domain/SessionRepository.ts";

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

export const signIn = ({ sessionRepository }: { readonly sessionRepository: SessionRepository }) =>
  async ({ email, password }: SignInInput): Promise<CurrentUser> => sessionRepository.signIn(UserEmail.create(email), password);
