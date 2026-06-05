import { ReactNode } from 'react';
import SupervisorSidebar from './supervisor-sidebar';

interface SupervisorShellProps {
  email?: string | null;
  name?: string | null;
  canCreateApplications?: boolean;
  canManageFieldWorkers?: boolean;
  children: ReactNode;
}

export default function SupervisorShell({ email, name, canCreateApplications, canManageFieldWorkers, children }: SupervisorShellProps) {
  return (
    <main className="min-h-dvh bg-[#f8fafc] text-[#0f1f33]">
      <SupervisorSidebar
        email={email}
        name={name}
        canCreateApplications={canCreateApplications}
        canManageFieldWorkers={canManageFieldWorkers}
      />
      <div className="min-h-dvh [--mobile-nav-offset:5rem] lg:pl-48 lg:[--mobile-nav-offset:0px]">
        <section className="mx-auto min-w-0 max-w-[1500px] px-3 py-3 pb-24 sm:px-4 sm:py-5 lg:px-5 lg:pb-5 xl:px-6">
          {children}
        </section>
      </div>
    </main>
  );
}
