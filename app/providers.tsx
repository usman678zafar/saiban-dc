'use client';

import { SessionProvider } from 'next-auth/react';
import { NavigationLoadingProvider } from '@/components/navigation-loading';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
    </SessionProvider>
  );
}

