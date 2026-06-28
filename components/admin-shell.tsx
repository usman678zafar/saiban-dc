import { ReactNode } from 'react';
import AdminSidebar from './admin-sidebar';
import { NavigationLoadingScope } from './navigation-loading';

interface AdminShellProps {
  email?: string | null;
  role?: string | null;
  children: ReactNode;
}

export default function AdminShell({ email, role, children }: AdminShellProps) {
  return (
    <main className="min-h-dvh bg-white text-[#0f1f33]">
      <AdminSidebar email={email} role={role} />
      <div className="sidebar-content min-h-dvh [--mobile-nav-offset:5rem] lg:[--mobile-nav-offset:0px]">
        <NavigationLoadingScope>
          <section className="admin-page-content mx-auto min-w-0 max-w-[1440px] px-3 py-3 pb-24 sm:px-4 sm:py-5 lg:px-4 lg:py-4 lg:pb-4 xl:px-5">
            {children}
          </section>
        </NavigationLoadingScope>
      </div>
    </main>
  );
}

