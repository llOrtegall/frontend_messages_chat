import type { UserEmail } from "../../user/domain/UserEmail.ts";
import type { CurrentUser } from "./CurrentUser.ts";
import type { EmailToken } from "./EmailToken.ts";
import type { Password } from "./Password.ts";
import type { ProfileChanges } from "./ProfileChanges.ts";

export interface AccountRepository {
  updateProfile(changes: ProfileChanges): Promise<CurrentUser>;
  confirmEmailVerification(token: EmailToken): Promise<void>;
  requestEmailVerification(): Promise<void>;
  requestPasswordReset(email: UserEmail): Promise<void>;
  /** The backend also ends every session of that user, this one included. */
  resetPassword(token: EmailToken, password: Password): Promise<void>;
}
