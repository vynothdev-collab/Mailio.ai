export type MailTesterCode = 'ok' | 'ko' | 'mb';

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
  result: 'valid' | 'invalid' | 'catchall' | 'unknown';
  reason: string;
  raw: RawMailTesterResponse;
}
