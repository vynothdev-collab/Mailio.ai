import type { UserProfile } from "@/src/types/user";

export const STORAGE_KEYS = {
  accessToken:  "mailio.accessToken",
  refreshToken: "mailio.refreshToken",
  userProfile:  "mailio.userProfile",
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

export function saveUserProfile(profile: UserProfile): void {
  try {
    safeStore()?.setItem(STORAGE_KEYS.userProfile, JSON.stringify(profile));
  } catch (err) {
    console.warn("[storage] Failed to persist user profile:", err);
  }
}

export function loadUserProfile(): UserProfile | null {
  try {
    const raw = safeStore()?.getItem(STORAGE_KEYS.userProfile);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}
