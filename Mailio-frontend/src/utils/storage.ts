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
    console.warn(`[storage] Failed to persist "${key}":`, err);
  }
}

export function getItem(key: string): string | null {
  return safeStore()?.getItem(key) ?? null;
}

function removeItem(key: string): void {
  safeStore()?.removeItem(key);
}

export function clearSession(): void {
  Object.values(STORAGE_KEYS).forEach(removeItem);
}
