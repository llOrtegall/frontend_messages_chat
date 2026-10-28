import type { DisplayName } from "../../user/domain/DisplayName.ts";
import type { UserEmail } from "../../user/domain/UserEmail.ts";
import type { CurrentUser } from "./CurrentUser.ts";
import type { Password } from "./Password.ts";

/** Signing in and out. The refresh token never reaches this app: the backend keeps it in an HttpOnly cookie. */
export interface SessionRepository {
  signIn(email: UserEmail, password: string): Promise<CurrentUser>;
  signUp(email: UserEmail, password: Password, displayName: DisplayName): Promise<CurrentUser>;
  /** The user of the session the refresh cookie still holds, or null when there is none. */
  restore(): Promise<CurrentUser | null>;
  signOut(): Promise<void>;
  /** Called when the session can no longer be renewed (expired, or revoked from elsewhere). */
  onExpired(listener: () => void): () => void;
}
