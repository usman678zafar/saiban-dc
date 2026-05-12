import { ReactNode } from 'react';
import AdminSidebar from './admin-sidebar';

interface AdminShellProps {
  email?: string | null;
  children: ReactNode;
}

export default function AdminShell({ email, children }: AdminShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr]">
        <AdminSidebar email={email} />
        <section className="min-w-0 px-4 py-6 pb-20 sm:px-8 sm:py-8 lg:pb-8">
          {children}
        </section>
      </div>
    </main>
  );
}
