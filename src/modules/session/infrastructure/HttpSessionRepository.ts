import { AuthResponseSchema, UserResponseSchema } from "../../../contracts/index.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import type { DisplayName } from "../../user/domain/DisplayName.ts";
import type { UserEmail } from "../../user/domain/UserEmail.ts";
import { CurrentUser } from "../domain/CurrentUser.ts";
import type { Password } from "../domain/Password.ts";
import type { SessionRepository } from "../domain/SessionRepository.ts";

const AUTH_ENDPOINT = { refreshOn401: false } as const;

export class HttpSessionRepository implements SessionRepository {
  constructor(private readonly http: ApiHttp) {}

  async signIn(email: UserEmail, password: string): Promise<CurrentUser> {
    const { user, accessToken } = await this.http.request("POST", "/api/v1/auth/login", AuthResponseSchema, {
      ...AUTH_ENDPOINT,
      body: { email: email.toPrimitive(), password },
    });
    this.http.setAccessToken(accessToken);
    return CurrentUser.fromPrimitive(user);
  }

  async signUp(email: UserEmail, password: Password, displayName: DisplayName): Promise<CurrentUser> {
    const { user, accessToken } = await this.http.request("POST", "/api/v1/auth/register", AuthResponseSchema, {
      ...AUTH_ENDPOINT,
      body: { email: email.toPrimitive(), password: password.toPrimitive(), displayName: displayName.toPrimitive() },
    });
    this.http.setAccessToken(accessToken);
    return CurrentUser.fromPrimitive(user);
  }

  async restore(): Promise<CurrentUser | null> {
    if (!(await this.http.refresh())) return null;
    const { user } = await this.http.request("GET", "/api/v1/auth/me", UserResponseSchema);
    return CurrentUser.fromPrimitive(user);
  }

  async signOut(): Promise<void> {
    try {
      await this.http.request("POST", "/api/v1/auth/logout", null, { ...AUTH_ENDPOINT, body: {} });
    } finally {
      // Signed out here even if the backend couldn't be told: the cookie then expires on its own.
      this.http.setAccessToken(null);
    }
  }

  onExpired(listener: () => void): () => void {
    return this.http.onExpired(listener);
  }
}
