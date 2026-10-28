import type { z } from "zod";
import { ApiErrorSchema, RefreshResponseSchema } from "../../../contracts/index.ts";
import { RequestFailedError } from "../domain/errors/RequestFailedError.ts";
import { readContract } from "./readContract.ts";

type Fetch = (url: URL, init: RequestInit) => Promise<Response>;

export interface ApiRequestOptions {
  readonly body?: unknown;
  readonly query?: Record<string, string | number | undefined>;
  /** Retry once after refreshing the session on 401 (default true; off for auth endpoints). */
  readonly refreshOn401?: boolean;
}

/**
 * The connection to our backend API that every HTTP repository shares. Keeps the access token in
 * memory only; the refresh token is an HttpOnly cookie sent because every request uses
 * `credentials: "include"`. Failures become RequestFailedError with the backend's code.
 */
export class ApiHttp {
  private accessToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;
  private readonly expiredListeners = new Set<() => void>();

  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: Fetch = (url, init) => fetch(url, init),
  ) {}

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  onExpired(listener: () => void): () => void {
    this.expiredListeners.add(listener);
    return () => this.expiredListeners.delete(listener);
  }

  /**
   * Exchanges the refresh cookie for a new access token. Single-flight: the backend treats a
   * reused rotated token as theft, so concurrent callers share one request.
   */
  refresh(): Promise<boolean> {
    this.refreshing ??= this.renewAccessToken().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  async request<S extends z.ZodType>(
    method: string,
    path: string,
    schema: S | null,
    options: ApiRequestOptions = {},
  ): Promise<z.infer<S>> {
    let response = await this.send(method, path, options);

    if (response.status === 401 && options.refreshOn401 !== false) {
      if (await this.refresh()) response = await this.send(method, path, options);
      else for (const listener of this.expiredListeners) listener();
    }

    if (!response.ok) throw await this.failureOf(response);
    if (!schema) return undefined as z.infer<S>;

    const parsed = readContract(schema, await response.json().catch(() => null));
    if (!parsed.success) {
      console.error(`Contract mismatch on ${method} ${path}`, parsed.error.issues);
      throw new RequestFailedError(RequestFailedError.UNEXPECTED_RESPONSE, response.status);
    }
    return parsed.data;
  }

  private async renewAccessToken(): Promise<boolean> {
    try {
      const data = await this.request("POST", "/api/v1/auth/refresh", RefreshResponseSchema, { refreshOn401: false });
      this.accessToken = data.accessToken;
      return true;
    } catch (error) {
      // No session to renew is an answer, not a failure: the caller signs the user out.
      if (!(error instanceof RequestFailedError)) throw error;
      this.accessToken = null;
      return false;
    }
  }

  private async failureOf(response: Response): Promise<RequestFailedError> {
    const body = ApiErrorSchema.safeParse(await response.json().catch(() => null));
    return body.success
      ? new RequestFailedError(body.data.code, response.status, body.data.error)
      : new RequestFailedError(RequestFailedError.FAILED, response.status, `HTTP ${response.status}`);
  }

  private async send(method: string, path: string, { body, query }: ApiRequestOptions): Promise<Response> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    try {
      return await this.fetchImpl(url, {
        method,
        headers,
        credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new RequestFailedError(RequestFailedError.NETWORK, null, `Could not reach ${url.origin}`);
    }
  }
}
