import { ReactNode } from 'react';
import ReviewerSidebar from './reviewer-sidebar';
import { NavigationLoadingScope } from './navigation-loading';

interface ReviewerShellProps {
  email?: string | null;
  name?: string | null;
  canCreateApplications?: boolean;
  children: ReactNode;
}

export default function ReviewerShell({ email, name, canCreateApplications, children }: ReviewerShellProps) {
  return (
    <main className="min-h-dvh bg-[#f8fafc] text-[#0f1f33]">
      <ReviewerSidebar email={email} name={name} canCreateApplications={canCreateApplications} />
      <div className="sidebar-content min-h-dvh [--mobile-nav-offset:5rem] lg:[--mobile-nav-offset:0px]">
        <NavigationLoadingScope>
          <section className="mx-auto min-w-0 max-w-[1500px] px-3 py-3 pb-24 sm:px-4 sm:py-5 lg:px-5 lg:pb-5 xl:px-6">
            {children}
          </section>
        </NavigationLoadingScope>
      </div>
    </main>
  );
}
