import { DisplayName } from "../../user/domain/DisplayName.ts";
import { UserEmail } from "../../user/domain/UserEmail.ts";
import type { CurrentUser } from "../domain/CurrentUser.ts";
import { Password } from "../domain/Password.ts";
import type { SessionRepository } from "../domain/SessionRepository.ts";

export interface SignUpInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}

export const signUp = ({ sessionRepository }: { readonly sessionRepository: SessionRepository }) =>
  async ({ email, password, displayName }: SignUpInput): Promise<CurrentUser> =>
    sessionRepository.signUp(UserEmail.create(email), Password.create(password), DisplayName.create(displayName));
