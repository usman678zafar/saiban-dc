export const SESSION_INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;
export const SESSION_INACTIVITY_REFRESH_MS = 5 * 60 * 1000;
export const SESSION_BROWSER_STORAGE_KEY = 'saiban:browser-session';

export const SESSION_INACTIVITY_TIMEOUT_SECONDS = SESSION_INACTIVITY_TIMEOUT_MS / 1000;
export const SESSION_INACTIVITY_REFRESH_SECONDS = SESSION_INACTIVITY_REFRESH_MS / 1000;

export function readLastActiveAt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isSessionIdleExpired(lastActiveAt: unknown, now = Date.now()) {
  const resolvedLastActiveAt = readLastActiveAt(lastActiveAt);
  if (!resolvedLastActiveAt) return false;
  return now - resolvedLastActiveAt >= SESSION_INACTIVITY_TIMEOUT_MS;
}
