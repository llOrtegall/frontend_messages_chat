import type { UserEmail } from "../../user/domain/UserEmail.ts";
import type { ActiveSessionId } from "./ActiveSessionId.ts";
import type { ActiveSessionList } from "./ActiveSessionList.ts";
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
  /** The backend ends every other session; this one stays signed in. */
  changePassword(currentPassword: string, newPassword: Password): Promise<void>;
  listSessions(): Promise<ActiveSessionList>;
  endSession(id: ActiveSessionId): Promise<void>;
}
