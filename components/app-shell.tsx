import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import SignOutButton from './sign-out-button';
import HeaderHelpMenu from './header-help-menu';
import logo from '@/assests/logo.png';

interface AppShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  maxWidth?: string;
  children: ReactNode;
}

export default async function AppShell({ title, description, actions, maxWidth = 'max-w-7xl', children }: AppShellProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin');

  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  const isFieldWorker = session?.user?.role === 'field_worker';
  const isSupervisor = session?.user?.role === 'supervisor';
  const isReviewer = session?.user?.role === 'reviewer';
  const canCreateApplications = isFieldWorker || isAdmin || ((isSupervisor || isReviewer) && Boolean(session.user.canCreateApplications));
  const navLinkClass = 'inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:h-10 sm:px-3 sm:text-sm';
  const primaryNavLinkClass = 'inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 sm:h-10 sm:px-3 sm:text-sm';
  const signOutClass = 'inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-200 sm:h-10 sm:px-4 sm:text-sm';

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className={`mx-auto flex flex-col gap-2 ${maxWidth} px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3`}>
          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Image src={logo} alt="Saiban" width={112} height={88} className="h-8 w-auto shrink-0 object-contain sm:h-11" priority />
              <div className="min-w-0">
                <p className="truncate text-[11px] leading-4 text-slate-500 sm:text-xs">{session?.user?.name ?? session?.user?.email ?? 'Signed in'}</p>
              </div>
            </div>
          </div>

          <nav className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:flex-nowrap sm:gap-1">
            {isAdmin ? (
              <Link href="/dashboard" className={navLinkClass}>
                Dashboard
              </Link>
            ) : null}
            {isSupervisor || isAdmin ? (
              <Link href="/supervisor" className={navLinkClass}>
                Supervisor
              </Link>
            ) : null}
            {isReviewer || isAdmin ? (
              <Link href="/reviewer" className={navLinkClass}>
                Reviewer
              </Link>
            ) : null}
            {canCreateApplications ? (
              <>
                <Link href="/applications" className={navLinkClass}>
                  Applications
                </Link>
                <Link href="/applications/new" className={primaryNavLinkClass}>
                  New Application
                </Link>
              </>
            ) : null}
            {isAdmin ? (
              <Link href="/admin" className={navLinkClass}>
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <div className={`mx-auto w-full flex-1 ${maxWidth} px-4 pb-24 pt-4 sm:px-8 sm:pb-24 sm:pt-6`}>
        <section className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
            {description ? <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">{actions}</div> : null}
        </section>

        {children}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className={`mx-auto flex w-full flex-col gap-2 ${maxWidth} px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-8`}>
          <p className="text-xs leading-5 text-slate-500">
            {isFieldWorker ? 'Need assistance with the volunteer portal?' : 'You are signed in to Saiban Orphan Support.'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {isFieldWorker ? <HeaderHelpMenu popoverClassName="bottom-16 top-auto sm:bottom-20 sm:top-auto" /> : null}
            <SignOutButton className={signOutClass} />
          </div>
        </div>
      </footer>
    </main>
  );
}

