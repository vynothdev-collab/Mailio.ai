import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as http from 'http';
import * as https from 'https';
import {
  EmailVerificationProvider,
  ProviderError,
  ProviderErrorKind,
} from '../providers/provider.interface';
import {
  MailTesterResponse,
  RawMailTesterResponse,
} from './interfaces/mailtester-response.interface';

const FREE_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'yandex.com',
  'yandex.ru',
]);

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'trashmail.com',
  'yopmail.com',
  'getnada.com',
  'maildrop.cc',
  'sharklasers.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'tempinbox.com',
  'dispostable.com',
  'mintemail.com',
  'mailcatch.com',
]);

@Injectable()
export class MailTesterService implements EmailVerificationProvider {
  readonly name = 'mailtester';
  private readonly logger = new Logger(MailTesterService.name);
  private readonly baseUrl: string;
  private readonly fallbackKey: string;

  constructor(
    private readonly httpService: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>(
      'MAILTESTER_BASE_URL',
      'https://happy.mailtester.ninja',
    );
    this.fallbackKey = config.get<string>('MAILTESTER_API_KEY', '');
  }

  getFallbackKey(): string {
    return this.fallbackKey;
  }

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
          httpAgent: new http.Agent({ family: 4, keepAlive: true }),
          httpsAgent: new https.Agent({ family: 4, keepAlive: true }),
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

  private classifyError(e: unknown): ProviderError {
    const err = e as AxiosError<{ message?: string }>;

    this.logger.error('Provider Error Details:', {
      name: err?.name,
      code: err?.code,
      message: err?.message,
      status: err?.response?.status,
      statusText: err?.response?.statusText,
      data: err?.response?.data,
      url: err?.config?.url,
      params: err?.config?.params as unknown,
    });

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
    } else if (status === 401 || status === 402) {
      kind = 'auth';
    } else if (status === 403) {
      const lower = msg.toLowerCase();
      const looksLikeKeyAuth =
        lower.includes('api key') ||
        lower.includes('apikey') ||
        lower.includes('unauthorized') ||
        lower.includes('forbidden key') ||
        lower.includes('invalid key') ||
        lower.includes('expired');
      kind = looksLikeKeyAuth ? 'auth' : 'bad-request';
    } else if (status >= 500) {
      kind = 'server';
    } else if (status === 400 || status === 422) {
      kind = 'bad-request';
    } else {
      kind = 'server';
    }

    return new ProviderError(kind, msg, retryAfterMs, status);
  }

  private normalize(
    email: string,
    raw: RawMailTesterResponse,
  ): MailTesterResponse {
    const message = (raw.message ?? '').trim();
    const code = raw.code;
    const domain = (raw.domain || email.split('@')[1] || '').toLowerCase();

    let result: MailTesterResponse['result'];
    let smtp_check = false;
    let mx_found = !!raw.mx;
    let catch_all: boolean | null = false;

    if (code === 'mb') {
      result = 'catchall';
      catch_all = null;
    } else {
      switch (message) {
        case 'Accepted':
          result = 'valid';
          smtp_check = true;
          break;
        case 'Catch-All':
          result = 'catchall';
          smtp_check = true;
          catch_all = true;
          break;
        case 'Limited':
        case 'SPAM Block':
          result = 'catchall';
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
          result = 'catchall';
          catch_all = null;
          break;
        default:
          if (code === 'ok') {
            result = 'valid';
            smtp_check = true;
          } else if (code === 'ko') {
            result = 'invalid';
          } else {
            result = 'catchall';
            catch_all = null;
          }
      }
    }

    const disposable = DISPOSABLE_DOMAINS.has(domain);
    const free = FREE_PROVIDERS.has(domain);

    return {
      email: raw.email ?? email,
      user: raw.user ?? email.split('@')[0],
      domain,
      mx_found,
      smtp_check,
      catch_all,
      disposable,
      free,
      score: this.scoreFor(result, { catch_all, disposable }),
      result,
      reason: message || code,
      raw,
    };
  }

  private scoreFor(
    result: MailTesterResponse['result'],
    flags: { catch_all: boolean | null; disposable: boolean },
  ): number {
    let base: number;
    switch (result) {
      case 'valid':
        base = 95;
        break;
      case 'catchall':
        base = 55;
        break;
      case 'invalid':
        base = 10;
        break;
      default:
        base = 30;
    }
    if (flags.catch_all) base = Math.min(base, 60);
    if (flags.disposable) base = Math.min(base, 25);
    return base;
  }
}
