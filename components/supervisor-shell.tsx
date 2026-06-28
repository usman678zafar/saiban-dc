import { ReactNode } from 'react';
import SupervisorSidebar from './supervisor-sidebar';
import { NavigationLoadingScope } from './navigation-loading';

interface SupervisorShellProps {
  email?: string | null;
  name?: string | null;
  canCreateApplications?: boolean;
  canManageFieldWorkers?: boolean;
  children: ReactNode;
}

export default function SupervisorShell({ email, name, canCreateApplications, canManageFieldWorkers, children }: SupervisorShellProps) {
  return (
    <main className="min-h-dvh bg-[#f6f9fd] text-[#0f1f33]">
      <SupervisorSidebar
        email={email}
        name={name}
        canCreateApplications={canCreateApplications}
        canManageFieldWorkers={canManageFieldWorkers}
      />
      <div className="sidebar-content min-h-dvh">
        <NavigationLoadingScope>
          <section className="mx-auto min-w-0 max-w-[1500px] px-3 pb-6 pt-20 sm:px-4 sm:pb-8 sm:pt-24 lg:px-5 lg:py-5 xl:px-6">
            {children}
          </section>
        </NavigationLoadingScope>
      </div>
    </main>
  );
}
