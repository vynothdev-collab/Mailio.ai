import { MailTesterResponse } from '../mailtester/interfaces/mailtester-response.interface';

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

export interface EmailVerificationProvider {
  /** Stable name used in the `provider` column of `api_keys`. */
  readonly name: string;

  verify(email: string, keyValue: string): Promise<MailTesterResponse>;
}
