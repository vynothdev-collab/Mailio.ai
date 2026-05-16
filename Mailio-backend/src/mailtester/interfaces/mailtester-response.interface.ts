/** Status code returned by the API. */
export type MailTesterCode = 'ok' | 'ko' | 'mb';

/** Free-form message describing the outcome. */
export type MailTesterMessage =
  | 'Accepted'
  | 'Limited'
  | 'Rejected'
  | 'Catch-All'
  | 'No Mx'
  | 'Mx Error'
  | 'Timeout'
  | 'SPAM Block'
  | string;

export interface RawMailTesterResponse {
  email: string;
  user: string;
  domain: string;
  mx: string;
  code: MailTesterCode;
  message: MailTesterMessage;
  connections: number;
}

/** Normalized shape used by the verification processor + single-verify service. */
export interface MailTesterResponse {
  email: string;
  user: string;
  domain: string;
  mx_found: boolean;
  smtp_check: boolean;
  catch_all: boolean | null;
  disposable: boolean;
  free: boolean;
  score: number;
  result: 'valid' | 'invalid' | 'risky' | 'unknown';
  reason: string;
  /** The original raw response, preserved for audit / debugging. */
  raw: RawMailTesterResponse;
}
