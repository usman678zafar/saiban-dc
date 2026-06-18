'use client';

import { SessionProvider } from 'next-auth/react';
import { NavigationLoadingProvider } from '@/components/navigation-loading';
import SessionInactivityTimeout from '@/components/session-inactivity-timeout';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionInactivityTimeout />
      <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
    </SessionProvider>
  );
}

