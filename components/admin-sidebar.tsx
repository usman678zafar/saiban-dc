'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, FolderKanban, LayoutDashboard, LogOut, PlusCircle, ShieldCheck, UserCog, UserCheck, UsersRound } from 'lucide-react';
import clsx from 'clsx';
import SignOutButton from './sign-out-button';
import logo from '@/assests/logo.png';

interface AdminSidebarProps {
  email?: string | null;
  role?: string | null;
}

const navItems = [
  { href: '/admin', label: 'Overview', mobileLabel: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/admin/applications', label: 'Applications', mobileLabel: 'Apps', icon: ClipboardList },
  { href: '/admin/applications/new', label: 'New Application', mobileLabel: 'New', icon: PlusCircle, exact: true },
  { href: '/admin/supervisors', label: 'Supervisors', mobileLabel: 'Supers', icon: ShieldCheck },
  { href: '/admin/reviewers', label: 'Reviewers', mobileLabel: 'Review', icon: UserCheck },
  { href: '/admin/field-workers', label: 'Field Workers', mobileLabel: 'Workers', icon: UsersRound },
  { href: '/admin/projects', label: 'Departments', mobileLabel: 'Depts', icon: FolderKanban },
  { href: '/admin/admins', label: 'Admins', mobileLabel: 'Admins', icon: UserCog, superAdminOnly: true },
  { href: '/dashboard', label: 'Field Dashboard', mobileLabel: 'Field', icon: BarChart3, exact: true },
];

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === '/admin/applications' && pathname.startsWith('/admin/applications/new')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({ email, role }: AdminSidebarProps) {
  const pathname = usePathname();
  const visibleNavItems = navItems.filter((item) => !item.superAdminOnly || role === 'super_admin');

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-48 flex-col overflow-y-auto border-r border-[#2f3d52] bg-[#1f2b3d] text-white lg:flex">
        <div className="border-b border-white/10 px-3 pb-4 pt-4 text-center">
          <Image src={logo} alt="Saiban" width={140} height={110} className="mx-auto h-16 w-auto object-contain" priority />
          <p className="mt-1.5 text-xs font-medium text-[#b7c6db]">Data Collection System</p>
        </div>

        <nav className="grid gap-1 px-2 py-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-xs font-semibold transition',
                  active
                    ? 'bg-[#3b82f6] text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)]'
                    : 'text-[#c9d4e2] hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 p-2.5">
          <div className="mb-3 min-w-0 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#91a1b7]">Admin Portal</p>
            <p className="mt-1 truncate text-xs font-medium text-white">{email ?? 'Signed in'}</p>
          </div>
          <SignOutButton className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign Out</span>
          </SignOutButton>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dbe4ef] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-2xl gap-1" style={{ gridTemplateColumns: `repeat(${visibleNavItems.length + 1}, minmax(0, 1fr))` }}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={clsx(
                  'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition sm:text-xs',
                  active ? 'bg-[#e8f1ff] text-[#2563eb]' : 'text-[#63758d] hover:bg-[#f4f7fb] hover:text-[#0f1f33]',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate">{item.mobileLabel}</span>
              </Link>
            );
          })}

          <SignOutButton className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold text-[#63758d] transition hover:bg-[#f4f7fb] hover:text-[#0f1f33] sm:text-xs">
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span>Out</span>
          </SignOutButton>
        </div>
      </nav>
    </>
  );
}



