import { DomainError } from "../DomainError.ts";

/**
 * The backend (HTTP or WebSocket) refused or could not answer a request. `code` is the backend's own
 * code (`room.not_member`…) when it sent one, or one of ours for failures it could not report.
 */
export class RequestFailedError extends DomainError {
  static readonly FAILED = "request.failed";
  static readonly NETWORK = "request.network";
  static readonly UNEXPECTED_RESPONSE = "request.unexpected_response";
  static readonly DISCONNECTED = "realtime.disconnected";
  static readonly TIMEOUT = "realtime.timeout";

  constructor(
    readonly code: string,
    /** HTTP status; null for WebSocket requests and network failures. */
    readonly status: number | null,
    detail = code,
  ) {
    super(detail);
  }

  /** The request never got an answer: trying again later may work. */
  isConnectionLost(): boolean {
    return [RequestFailedError.NETWORK, RequestFailedError.DISCONNECTED, RequestFailedError.TIMEOUT].includes(this.code);
  }
}
