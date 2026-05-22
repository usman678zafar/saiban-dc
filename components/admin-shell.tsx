import { ReactNode } from 'react';
import AdminSidebar from './admin-sidebar';

interface AdminShellProps {
  email?: string | null;
  role?: string | null;
  children: ReactNode;
}

export default function AdminShell({ email, role, children }: AdminShellProps) {
  return (
    <main className="min-h-dvh bg-white text-[#0f1f33]">
      <AdminSidebar email={email} role={role} />
      <div className="min-h-dvh [--mobile-nav-offset:5rem] lg:pl-48 lg:[--mobile-nav-offset:0px]">
        <section className="mx-auto min-w-0 max-w-[1500px] px-3 py-3 pb-24 sm:px-4 sm:py-5 lg:px-5 lg:pb-5 xl:px-6">
          {children}
        </section>
      </div>
    </main>
  );
}

