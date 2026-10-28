import { UserResponseSchema } from "../../../contracts/index.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import type { UserEmail } from "../../user/domain/UserEmail.ts";
import type { AccountRepository } from "../domain/AccountRepository.ts";
import { CurrentUser } from "../domain/CurrentUser.ts";
import type { EmailToken } from "../domain/EmailToken.ts";
import type { Password } from "../domain/Password.ts";
import type { ProfileChanges } from "../domain/ProfileChanges.ts";

// Emailed-token endpoints work without a session; a 401 there must not try to renew one.
const ANONYMOUS = { refreshOn401: false } as const;

export class HttpAccountRepository implements AccountRepository {
  constructor(private readonly http: ApiHttp) {}

  async updateProfile(changes: ProfileChanges): Promise<CurrentUser> {
    const { user } = await this.http.request("PATCH", "/api/v1/users/me", UserResponseSchema, { body: changes.toPrimitive() });
    return CurrentUser.fromPrimitive(user);
  }

  async confirmEmailVerification(token: EmailToken): Promise<void> {
    await this.http.request("POST", "/api/v1/auth/verify-email/confirm", null, { ...ANONYMOUS, body: { token: token.toPrimitive() } });
  }

  async requestEmailVerification(): Promise<void> {
    await this.http.request("POST", "/api/v1/auth/verify-email/request", null, { body: {} });
  }

  async requestPasswordReset(email: UserEmail): Promise<void> {
    await this.http.request("POST", "/api/v1/auth/password-reset/request", null, { ...ANONYMOUS, body: { email: email.toPrimitive() } });
  }

  async resetPassword(token: EmailToken, password: Password): Promise<void> {
    await this.http.request("POST", "/api/v1/auth/password-reset/confirm", null, {
      ...ANONYMOUS,
      body: { token: token.toPrimitive(), newPassword: password.toPrimitive() },
    });
    this.http.setAccessToken(null);
  }
}
