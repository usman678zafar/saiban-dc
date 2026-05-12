'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, LayoutDashboard, LogOut, PlusCircle, UsersRound } from 'lucide-react';
import clsx from 'clsx';
import SignOutButton from './sign-out-button';
import logo from '@/assests/logo.png';

interface AdminSidebarProps {
  email?: string | null;
}

const navItems = [
  { href: '/admin', label: 'Overview', mobileLabel: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/admin/applications', label: 'Applications', mobileLabel: 'Apps', icon: ClipboardList },
  { href: '/admin/applications/new', label: 'New Application', mobileLabel: 'New', icon: PlusCircle, exact: true },
  { href: '/admin/field-workers', label: 'Field Workers', mobileLabel: 'Workers', icon: UsersRound },
  { href: '/dashboard', label: 'Field Dashboard', mobileLabel: 'Field', icon: BarChart3, exact: true },
];

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === '/admin/applications' && pathname.startsWith('/admin/applications/new')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({ email }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col overflow-y-auto border-r border-slate-200 bg-white lg:flex">
        <div className="flex justify-center px-6 pb-5 pt-6">
          <Image src={logo} alt="Saiban" width={192} height={150} className="h-24 w-auto object-contain" priority />
        </div>

        <nav className="grid gap-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                  active
                    ? 'bg-blue-50 text-blue-700 shadow-[inset_3px_0_0_#2563eb]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-200 p-4">
          <div className="mb-4 min-w-0 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Admin Portal</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-700">{email ?? 'Signed in'}</p>
          </div>
          <SignOutButton className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign Out</span>
          </SignOutButton>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={clsx(
                  'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition sm:text-xs',
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate">{item.mobileLabel}</span>
              </Link>
            );
          })}

          <SignOutButton className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 sm:text-xs">
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span>Out</span>
          </SignOutButton>
        </div>
      </nav>
    </>
  );
}
