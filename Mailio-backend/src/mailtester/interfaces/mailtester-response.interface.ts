// Two shapes:
//   1. RawMailTesterResponse — the literal JSON returned by
//      https://happy.mailtester.ninja/ninja
//   2. MailTesterResponse — normalized shape the rest of the app consumes.
//      Built from the raw response by mailtester.service.ts.
//
// The real API only tells us code + message + mx; it does not return
// score / disposable / free-provider info, so those are derived locally.

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
  email:       string;
  user:        string;
  domain:      string;
  mx:          string;
  code:        MailTesterCode;
  message:     MailTesterMessage;
  connections: number;
}

/** Normalized shape used by the verification processor + single-verify service. */
export interface MailTesterResponse {
  email:       string;
  user:        string;
  domain:      string;
  mx_found:    boolean;
  smtp_check:  boolean;
  catch_all:   boolean | null;
  disposable:  boolean;
  free:        boolean;
  score:       number;
  result:      'valid' | 'invalid' | 'risky' | 'unknown';
  reason:      string;
  /** The original raw response, preserved for audit / debugging. */
  raw:         RawMailTesterResponse;
}
