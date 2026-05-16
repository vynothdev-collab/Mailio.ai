import { MailTesterResponse } from '../mailtester/interfaces/mailtester-response.interface';

/**
 * Strongly-classified error kinds so the KeyPool can react appropriately:
 *
 *   - rate-limit      → mark key cooldown using the provider's retry hint
 *   - auth            → mark key DISABLED (revoked / quota-exhausted)
 *   - server          → transient; bump failure_count, BullMQ retries
 *   - network         → transient; bump failure_count, BullMQ retries
 *   - bad-request     → do NOT retry; mark email INVALID
 */
export type ProviderErrorKind =
  | 'rate-limit'
  | 'auth'
  | 'server'
  | 'network'
  | 'bad-request';

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    readonly retryAfterMs?: number,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Every external verification provider implements this surface. Plugged
 * into the ProviderRegistry under a name (e.g. 'mailtester'); the worker
 * picks one via KeyPool.acquireKey(name) and calls verify().
 *
 * The key is passed per-call so the provider class is stateless w.r.t.
 * credentials — KeyPool owns key lifecycle, the provider just uses what
 * it's given.
 */
export interface EmailVerificationProvider {
  /** Stable name used in the `provider` column of `api_keys`. */
  readonly name: string;

  /**
   * Verify a single address using the supplied credential. Must throw
   * ProviderError with a classified kind on any failure — KeyPool relies
   * on the kind to decide cooldown vs. disable vs. transient.
   */
  verify(email: string, keyValue: string): Promise<MailTesterResponse>;
}
