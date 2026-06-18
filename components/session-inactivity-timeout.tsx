'use client';

import { useCallback, useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  SESSION_BROWSER_STORAGE_KEY,
  SESSION_INACTIVITY_REFRESH_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
  isSessionIdleExpired,
  readLastActiveAt,
} from '@/lib/session-timeout';

const LAST_ACTIVITY_STORAGE_KEY = 'saiban:last-active-at';
const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'input'] as const;

function getStoredLastActivity() {
  if (typeof window === 'undefined') return null;
  return readLastActiveAt(window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY));
}

function storeLastActivity(lastActiveAt: number) {
  window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(lastActiveAt));
}

function hasBrowserSession() {
  return Boolean(window.sessionStorage.getItem(SESSION_BROWSER_STORAGE_KEY));
}

function refreshBrowserSession() {
  window.sessionStorage.setItem(SESSION_BROWSER_STORAGE_KEY, String(Date.now()));
}

export default function SessionInactivityTimeout() {
  const { data: session, status, update } = useSession();
  const timeoutRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastServerRefreshRef = useRef<number>(0);
  const signingOutRef = useRef(false);
  const updateInFlightRef = useRef(false);

  const clearIdleTimer = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const signOutToSignin = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    clearIdleTimer();
    try {
      await signOut({ callbackUrl: '/signin' });
    } catch {
      window.location.href = '/signin';
    }
  }, [clearIdleTimer]);

  const scheduleIdleTimer = useCallback(() => {
    clearIdleTimer();
    const idleFor = Date.now() - lastActivityRef.current;
    const delay = Math.max(0, SESSION_INACTIVITY_TIMEOUT_MS - idleFor);

    timeoutRef.current = window.setTimeout(() => {
      if (isSessionIdleExpired(lastActivityRef.current)) {
        void signOutToSignin();
        return;
      }
      scheduleIdleTimer();
    }, delay);
  }, [clearIdleTimer, signOutToSignin]);

  const refreshServerActivity = useCallback((now: number) => {
    if (updateInFlightRef.current || now - lastServerRefreshRef.current < SESSION_INACTIVITY_REFRESH_MS) return;

    lastServerRefreshRef.current = now;
    updateInFlightRef.current = true;
    update({ lastActiveAt: now })
      .catch(() => {
        lastServerRefreshRef.current = 0;
      })
      .finally(() => {
        updateInFlightRef.current = false;
      });
  }, [update]);

  const markActivity = useCallback(() => {
    if (signingOutRef.current) return;

    const now = Date.now();
    lastActivityRef.current = now;
    refreshBrowserSession();
    storeLastActivity(now);
    refreshServerActivity(now);
    scheduleIdleTimer();
  }, [refreshServerActivity, scheduleIdleTimer]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) {
      clearIdleTimer();
      signingOutRef.current = false;
      return;
    }

    if (!hasBrowserSession()) {
      void signOutToSignin();
      return;
    }

    const sessionLastActiveAt = readLastActiveAt(session.user.lastActiveAt);
    const storedLastActiveAt = getStoredLastActivity();
    const initialLastActiveAt = sessionLastActiveAt ?? storedLastActiveAt ?? Date.now();

    if (isSessionIdleExpired(initialLastActiveAt)) {
      void signOutToSignin();
      return;
    }

    lastActivityRef.current = initialLastActiveAt;
    lastServerRefreshRef.current = sessionLastActiveAt ?? 0;
    markActivity();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && isSessionIdleExpired(lastActivityRef.current)) {
        void signOutToSignin();
        return;
      }
      markActivity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LAST_ACTIVITY_STORAGE_KEY) return;
      const nextLastActiveAt = readLastActiveAt(event.newValue);
      if (!nextLastActiveAt) return;
      lastActivityRef.current = nextLastActiveAt;
      scheduleIdleTimer();
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorage);
      clearIdleTimer();
    };
  }, [clearIdleTimer, markActivity, scheduleIdleTimer, session?.user, signOutToSignin, status]);

  return null;
}
