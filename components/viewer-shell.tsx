'use client';

import { ReactNode } from 'react';
import ViewerSidebar from './viewer-sidebar';
import { ViewerLanguageProvider } from './viewer-language';
import { NavigationLoadingScope } from './navigation-loading';

interface ViewerShellProps {
  email?: string | null;
  children: ReactNode;
}

export default function ViewerShell({ email, children }: ViewerShellProps) {
  return (
    <ViewerLanguageProvider>
      <main className="min-h-dvh bg-[#f3f7fc] text-[#0f1f33]">
        <ViewerSidebar email={email} />
        <div className="sidebar-content min-h-dvh">
          <NavigationLoadingScope>
            <section className="mx-auto min-w-0 max-w-[1500px] px-3 pb-6 pt-20 sm:px-4 sm:pb-8 sm:pt-24 lg:px-5 lg:py-5 xl:px-6">
              {children}
            </section>
          </NavigationLoadingScope>
        </div>
      </main>
    </ViewerLanguageProvider>
  );
}
