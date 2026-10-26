import type { z } from "zod";
import { ApiErrorSchema, RefreshResponseSchema } from "../../contracts/index.ts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Fetch = (url: URL, init: RequestInit) => Promise<Response>;

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Retry once after refreshing the session on 401 (default true; off for auth endpoints). */
  refreshOn401?: boolean;
}

/**
 * fetch wrapper for the backend API. Keeps the access token in memory only; the refresh token
 * is an HttpOnly cookie sent because every request uses `credentials: "include"`.
 * Responses are validated against the shared contracts.
 */
export class HttpClient {
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
    this.refreshing ??= (async () => {
      try {
        const data = await this.request("POST", "/api/v1/auth/refresh", RefreshResponseSchema, { refreshOn401: false });
        this.accessToken = data.accessToken;
        return true;
      } catch {
        this.accessToken = null;
        return false;
      }
    })().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  async request<S extends z.ZodType>(
    method: string,
    path: string,
    schema: S | null,
    options: RequestOptions = {},
  ): Promise<z.infer<S>> {
    let res = await this.send(method, path, options);

    if (res.status === 401 && options.refreshOn401 !== false) {
      if (await this.refresh()) {
        res = await this.send(method, path, options);
      } else {
        for (const l of this.expiredListeners) l();
      }
    }

    if (!res.ok) {
      const body = ApiErrorSchema.safeParse(await res.json().catch(() => null));
      throw new ApiError(res.status, body.success ? (body.data.detail ?? body.data.error) : `HTTP ${res.status}`);
    }
    if (!schema) return undefined as z.infer<S>;

    const parsed = schema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
      console.error(`Contract mismatch on ${method} ${path}`, parsed.error.issues);
      throw new ApiError(res.status, "Respuesta inesperada del servidor");
    }
    return parsed.data;
  }

  private send(method: string, path: string, { body, query }: RequestOptions): Promise<Response> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    return this.fetchImpl(url, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
}
