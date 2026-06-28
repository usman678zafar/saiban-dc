'use client';

import { ReactNode } from 'react';
import ViewerSidebar from './viewer-sidebar';
import { ViewerLanguageProvider } from './viewer-language';

interface ViewerShellProps {
  email?: string | null;
  children: ReactNode;
}

export default function ViewerShell({ email, children }: ViewerShellProps) {
  return (
    <ViewerLanguageProvider>
      <main className="min-h-dvh bg-[#f2f6fb] text-[#0f1f33]">
        <ViewerSidebar email={email} />
        <div className="sidebar-content min-h-dvh [--mobile-nav-offset:5rem] lg:[--mobile-nav-offset:0px]">
          <section className="mx-auto min-w-0 max-w-[1500px] px-3 py-3 pb-24 sm:px-4 sm:py-5 lg:px-5 lg:pb-5 xl:px-6">
            {children}
          </section>
        </div>
      </main>
    </ViewerLanguageProvider>
  );
}
