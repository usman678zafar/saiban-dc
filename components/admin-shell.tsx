import { ReactNode } from 'react';
import AdminSidebar from './admin-sidebar';

interface AdminShellProps {
  email?: string | null;
  children: ReactNode;
}

export default function AdminShell({ email, children }: AdminShellProps) {
  return (
    <main className="min-h-dvh bg-white text-[#0f1f33]">
      <AdminSidebar email={email} />
      <div className="min-h-dvh lg:pl-60">
        <section className="mx-auto min-w-0 max-w-[1600px] px-3 py-4 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-8 xl:px-10">
          {children}
        </section>
      </div>
    </main>
  );
}
