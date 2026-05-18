// Session storage abstraction — sessionStorage only.
//
// Tokens are scoped to a single browser tab. This guarantees that logging
// in as User B in one tab cannot overwrite User A's session in another tab.
// Durable "remember me" persistence would require an HttpOnly refresh cookie
// issued by the backend; until then, closing the tab logs the user out.

export const STORAGE_KEYS = {
  accessToken:  "mailio.accessToken",
  refreshToken: "mailio.refreshToken",
} as const;

function safeStore(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function setItem(key: string, value: string): void {
  try {
    safeStore()?.setItem(key, value);
  } catch (err) {
    // QuotaExceededError or storage disabled (Safari private mode, etc.).
    // eslint-disable-next-line no-console
    console.warn(`[storage] Failed to persist "${key}":`, err);
  }
}

export function getItem(key: string): string | null {
  return safeStore()?.getItem(key) ?? null;
}

export function removeItem(key: string): void {
  safeStore()?.removeItem(key);
}

/** Wipe every auth-related key from the tab's session store. */
export function clearSession(): void {
  Object.values(STORAGE_KEYS).forEach(removeItem);
}
