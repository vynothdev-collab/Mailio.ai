import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  EmailVerificationProvider,
  ProviderError,
  ProviderErrorKind,
} from '../providers/provider.interface';
import {
  MailTesterResponse,
  RawMailTesterResponse,
} from './interfaces/mailtester-response.interface';

// Common free-mailbox providers — used to set the `free` flag locally,
// since the real API doesn't surface this.
const FREE_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com',
  'proton.me', 'protonmail.com',
  'zoho.com', 'gmx.com', 'gmx.net',
  'mail.com', 'yandex.com', 'yandex.ru',
]);

// Common disposable domains. Tiny list — extend as needed.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', 'guerrillamail.com',
  '10minutemail.com', 'trashmail.com', 'yopmail.com',
  'getnada.com', 'maildrop.cc', 'sharklasers.com',
  'throwawaymail.com', 'fakeinbox.com', 'tempinbox.com',
  'dispostable.com', 'mintemail.com', 'mailcatch.com',
]);

@Injectable()
export class MailTesterService implements EmailVerificationProvider {
  readonly name = 'mailtester';
  private readonly logger = new Logger(MailTesterService.name);
  private readonly baseUrl: string;
  private readonly fallbackKey: string;
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('MAILTESTER_BASE_URL', 'https://happy.mailtester.ninja');
    // Retained as a last-resort fallback when no rows exist in the
    // api_keys table yet (first deploy after Phase 3 migration). On
    // boot the KeyPool seeder copies this value into the DB and then
    // ignores the env variable. Empty string is fine — the seeder
    // simply skips creating a row.
    this.fallbackKey = config.get<string>('MAILTESTER_API_KEY', '');
    this.timeout = config.get<number>('MAILTESTER_TIMEOUT_MS', 30000);
  }

  /** Exposed so the KeyPool seeder can decide whether to seed a row. */
  getFallbackKey(): string {
    return this.fallbackKey;
  }

  /**
   * Implements EmailVerificationProvider. The credential is passed in by
   * the caller (KeyPool selected it); when omitted we fall back to the
   * env-baked key for backward compatibility with un-migrated deployments.
   */
  async verify(email: string, keyValue?: string): Promise<MailTesterResponse> {
    const key = keyValue || this.fallbackKey;
    if (!key) {
      throw new ProviderError(
        'auth',
        'No MailTester API key available (KeyPool empty and MAILTESTER_API_KEY unset)',
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<RawMailTesterResponse>(`${this.baseUrl}/ninja`, {
          params: { email, key },
          timeout: this.timeout,
        }),
      );
      const normalized = this.normalize(email, data);
      this.logger.debug(
        `Verified ${email} → ${normalized.result} (code=${data.code}, msg=${data.message})`,
      );
      return normalized;
    } catch (e) {
      throw this.classifyError(e);
    }
  }

  /**
   * Map axios / network failures onto ProviderErrorKind so the KeyPool can
   * decide whether to cooldown the key, disable it, or just bump a counter.
   * The retry-after hint from a 429 response gets passed through verbatim
   * so we honour the provider's own backoff signal.
   */
  private classifyError(e: unknown): ProviderError {
    const err = e as AxiosError<{ message?: string }>;
    const status = err.response?.status;
    const body = err.response?.data;
    const msg = body?.message || err.message || 'Unknown error';

    let kind: ProviderErrorKind;
    let retryAfterMs: number | undefined;

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      kind = 'network';
    } else if (!status) {
      kind = 'network';
    } else if (status === 429) {
      kind = 'rate-limit';
      const ra = err.response?.headers?.['retry-after'];
      if (ra) {
        const n = Number(ra);
        if (Number.isFinite(n)) retryAfterMs = n * 1000;
      }
    } else if (status === 401 || status === 403 || status === 402) {
      kind = 'auth';
    } else if (status >= 500) {
      kind = 'server';
    } else if (status === 400 || status === 422) {
      kind = 'bad-request';
    } else {
      kind = 'server';
    }

    return new ProviderError(kind, msg, retryAfterMs, status);
  }

  /**
   * Map the API's (code, message, mx) tuple into the shape the rest of
   * the app expects. Reference for codes/messages:
   *   - code: ok | ko | mb (mailbox unverifiable → treated as risky)
   *   - message: Accepted | Limited | Rejected | Catch-All | No Mx | Mx Error | Timeout | SPAM Block
   *
   * The `mb` code is the API's "we couldn't conclusively prove this address
   * works or doesn't" bucket — surfaced to the user as "risky" so they have
   * a clear signal rather than the ambiguous "unknown".
   */
  private normalize(email: string, raw: RawMailTesterResponse): MailTesterResponse {
    const message = (raw.message ?? '').trim();
    const code    = raw.code;
    const domain  = (raw.domain || email.split('@')[1] || '').toLowerCase();

    let result: MailTesterResponse['result'];
    let smtp_check = false;
    let mx_found   = !!raw.mx;
    let catch_all: boolean | null = false;

    // `mb` (unverifiable) always maps to risky regardless of message —
    // covers timeouts, ambiguous SMTP responses, etc.
    if (code === 'mb') {
      result = 'risky';
      catch_all = null;
    } else {
      switch (message) {
        case 'Accepted':
          result = 'valid';
          smtp_check = true;
          break;
        case 'Catch-All':
          result = 'risky';
          smtp_check = true;
          catch_all = true;
          break;
        case 'Limited':
        case 'SPAM Block':
          result = 'risky';
          smtp_check = true;
          break;
        case 'Rejected':
          result = 'invalid';
          smtp_check = false;
          break;
        case 'No Mx':
        case 'Mx Error':
          result = 'invalid';
          mx_found = false;
          break;
        case 'Timeout':
          // Treat timeouts as risky too — same outcome class as `mb`.
          result = 'risky';
          catch_all = null;
          break;
        default:
          // Fall back to the code if the message is unfamiliar.
          if (code === 'ok')      { result = 'valid';   smtp_check = true; }
          else if (code === 'ko') { result = 'invalid'; }
          else                    { result = 'risky';   catch_all = null; }
      }
    }

    const disposable = DISPOSABLE_DOMAINS.has(domain);
    const free       = FREE_PROVIDERS.has(domain);

    return {
      email:      raw.email ?? email,
      user:       raw.user ?? email.split('@')[0],
      domain,
      mx_found,
      smtp_check,
      catch_all,
      disposable,
      free,
      score:      this.scoreFor(result, { catch_all, disposable }),
      result,
      reason:     message || code,
      raw,
    };
  }

  /** Heuristic 0–100 score so downstream confidence calculations have a value. */
  private scoreFor(
    result: MailTesterResponse['result'],
    flags: { catch_all: boolean | null; disposable: boolean },
  ): number {
    let base: number;
    switch (result) {
      case 'valid':   base = 95; break;
      case 'risky':   base = 55; break;
      case 'invalid': base = 10; break;
      default:        base = 30;
    }
    if (flags.catch_all) base = Math.min(base, 60);
    if (flags.disposable) base = Math.min(base, 25);
    return base;
  }
}
