import type { CurrentUser } from "../domain/entities.ts";
import type { AuthGateway } from "../domain/ports.ts";
import { Store } from "./store.ts";

export type SessionState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: CurrentUser };

export class SessionStore extends Store<SessionState> {
  private restoring: Promise<void> | null = null;
  private readonly verifying = new Map<string, Promise<void>>();

  constructor(private readonly auth: AuthGateway) {
    super({ status: "loading", user: null });
    auth.onExpired(() => this.setState({ status: "anonymous", user: null }));
  }

  /** Idempotent: safe to call from effects that run twice (React StrictMode). */
  restore(): Promise<void> {
    this.restoring ??= this.auth
      .restore()
      .then((user) => this.setUser(user))
      .catch(() => this.setUser(null));
    return this.restoring;
  }

  async login(email: string, password: string): Promise<void> {
    this.setUser(await this.auth.login(email, password));
  }

  async register(email: string, password: string, displayName: string): Promise<void> {
    this.setUser(await this.auth.register(email, password, displayName));
  }

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      this.setUser(null);
    }
  }

  /**
   * Confirms an emailed verification token. Single-flight per token: React may run the page's
   * effect twice and the token can only be redeemed once.
   */
  verifyEmail(token: string): Promise<void> {
    let pending = this.verifying.get(token);
    if (!pending) {
      pending = this.auth.verifyEmail(token).then(async () => {
        if (this.getSnapshot().status === "authenticated") this.setUser(await this.auth.me());
      });
      this.verifying.set(token, pending);
    }
    return pending;
  }

  resendVerification(): Promise<void> {
    return this.auth.resendVerification();
  }

  requestPasswordReset(email: string): Promise<void> {
    return this.auth.requestPasswordReset(email.trim());
  }

  /** The backend revokes every session of the user, so this one ends too. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.auth.resetPassword(token, newPassword);
    this.setUser(null);
  }

  private setUser(user: CurrentUser | null): void {
    this.setState(user ? { status: "authenticated", user } : { status: "anonymous", user: null });
  }
}
