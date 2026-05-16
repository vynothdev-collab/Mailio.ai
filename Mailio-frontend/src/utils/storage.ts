// Session storage abstraction.
//
// "Remember me" toggles whether tokens persist across browser restarts:
//   - remember = true  → localStorage   (durable)
//   - remember = false → sessionStorage (cleared on tab close)
//
// We always write to ONE store at a time and clear the other to avoid stale
// tokens leaking across sessions. Reads check both so callers don't need to
// know which one was used.

export const STORAGE_KEYS = {
  accessToken:  "mailio.accessToken",
  refreshToken: "mailio.refreshToken",
  user:         "mailio.user",
  // Tracks which backing store currently holds the session.
  persistence:  "mailio.persistence",
} as const;

export type Persistence = "local" | "session";

/** Browser-only guard so SSR doesn't crash. */
function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

function storeFor(persistence: Persistence): Storage | null {
  const w = safeWindow();
  if (!w) return null;
  return persistence === "local" ? w.localStorage : w.sessionStorage;
}

/** Write a value into the chosen store and clear it from the other. */
export function setItem(key: string, value: string, persistence: Persistence): void {
  const w = safeWindow();
  if (!w) return;
  try {
    storeFor(persistence)?.setItem(key, value);
    // Clear the opposite store so we never have two competing copies.
    (persistence === "local" ? w.sessionStorage : w.localStorage).removeItem(key);
  } catch (err) {
    // QuotaExceededError or storage disabled (Safari private mode, etc.).
    // Falling back to the other store would just defer the same failure;
    // log and continue so the caller's flow isn't aborted.
    // eslint-disable-next-line no-console
    console.warn(`[storage] Failed to persist "${key}":`, err);
  }
}

/** Read a value from whichever store currently holds it. */
export function getItem(key: string): string | null {
  const w = safeWindow();
  if (!w) return null;
  return w.localStorage.getItem(key) ?? w.sessionStorage.getItem(key);
}

/** Remove a value from both stores. */
export function removeItem(key: string): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.removeItem(key);
  w.sessionStorage.removeItem(key);
}

/** Wipe every auth-related key from both stores. */
export function clearSession(): void {
  Object.values(STORAGE_KEYS).forEach(removeItem);
}

/**
 * Detect which store currently owns the session.
 * Used by the refresh-token flow to write the new accessToken back into
 * the same store the user originally chose via "remember me".
 */
export function getCurrentPersistence(): Persistence {
  const explicit = getItem(STORAGE_KEYS.persistence);
  if (explicit === "local" || explicit === "session") return explicit;
  // Fallback: infer from where the access token actually lives.
  const w = safeWindow();
  if (!w) return "local";
  if (w.sessionStorage.getItem(STORAGE_KEYS.accessToken)) return "session";
  return "local";
}
