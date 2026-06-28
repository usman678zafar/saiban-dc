'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, KeyRound, LogOut } from 'lucide-react';
import clsx from 'clsx';
import SignOutButton from './sign-out-button';
import logo from '@/assests/logo.png';
import { useSidebarCollapse } from './use-sidebar-collapse';
import type { LucideIcon } from 'lucide-react';

interface ReviewerSidebarProps {
  email?: string | null;
  name?: string | null;
  canCreateApplications?: boolean;
}

interface ReviewerNavItem {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  requiresCreateAccess?: boolean;
}

const navItems: ReviewerNavItem[] = [
  { href: '/reviewer/applications', label: 'Applications', mobileLabel: 'Apps', icon: ClipboardCheck },
  { href: '/applications', label: 'Your Applications', mobileLabel: 'Yours', icon: ClipboardList, requiresCreateAccess: true },
  { href: '/reviewer/account', label: 'Account', mobileLabel: 'Acct', icon: KeyRound },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/reviewer/applications') return pathname === '/reviewer' || pathname === href || pathname.startsWith(`${href}/`);
  if (href === '/applications' && pathname.startsWith('/applications/new')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ReviewerSidebar({ email, name, canCreateApplications }: ReviewerSidebarProps) {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebarCollapse();
  const visibleNavItems = navItems.filter((item) => !item.requiresCreateAccess || canCreateApplications);
  const displayName = name || email || 'Reviewer';
  const profileInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <aside className={clsx('admin-sidebar-scrollbar fixed inset-y-0 left-0 z-40 hidden flex-col overflow-y-auto border-r border-[#dbe4ef] bg-white text-[#0f1f33] shadow-[4px_0_24px_rgba(15,31,51,0.025)] transition-[width] duration-200 lg:flex', collapsed ? 'w-[4.75rem]' : 'w-48')}>
        <div className={clsx('border-b border-[#e5ebf3] text-center', collapsed ? 'px-2 pb-3 pt-4' : 'px-3 pb-4 pt-4')}>
          <Image src={logo} alt="Saiban" width={160} height={125} className={clsx('mx-auto w-auto object-contain transition-[height] duration-200', collapsed ? 'h-11' : 'h-20')} priority />
          {!collapsed && <p className="mt-1 text-[11px] font-medium text-[#63758d]">Reviewer Portal</p>}
        </div>

        <nav className="grid gap-1 px-2 py-4" aria-label="Reviewer navigation">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <div key={item.href}>
                <Link href={item.href} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined} className={clsx('flex min-h-10 items-center rounded-xl text-xs font-semibold transition-colors', collapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5', active ? 'bg-[#eaf2ff] text-[#2563eb]' : 'text-[#52657d] hover:bg-[#f4f7fb] hover:text-[#0f1f33]')}>
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#e5ebf3] p-2">
          <div className={clsx('mb-2 flex min-w-0 items-center rounded-xl border border-[#e5ebf3] bg-[#f8fafc]', collapsed ? 'justify-center p-2' : 'gap-2.5 p-2.5')}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dceaff] text-xs font-bold text-[#2563eb]">{profileInitial}</span>
            {!collapsed && <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#7b8ca3]">Reviewer</p><p className="mt-0.5 truncate text-xs font-semibold text-[#0f1f33]">{displayName}</p></div>}
          </div>
          <SignOutButton ariaLabel="Sign out" className={clsx('flex min-h-9 w-full items-center justify-center rounded-lg px-2 text-xs font-semibold text-[#64748b] transition-colors hover:bg-[#fff1f2] hover:text-[#dc2626]', !collapsed && 'gap-2')}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {!collapsed && <span>Sign Out</span>}
          </SignOutButton>
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="mt-1 flex min-h-8 w-full items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-[#f4f7fb] hover:text-[#475569]" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dbe4ef] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl gap-1" style={{ gridTemplateColumns: `repeat(${visibleNavItems.length + 1}, minmax(0, 1fr))` }}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

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
