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
  const navLinkClass = 'inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:min-h-0 sm:w-auto sm:px-3 sm:py-2.5';
  const primaryNavLinkClass = 'inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-blue-600 px-2.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 sm:min-h-0 sm:w-auto sm:px-3 sm:py-2.5';
  const signOutClass = 'inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-slate-100 px-2.5 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 sm:min-h-0 sm:w-auto sm:px-3 sm:py-2.5';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className={`mx-auto flex flex-col gap-3 ${maxWidth} px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6`}>
          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
            <div className="flex min-w-0 items-center gap-2">
              <Image src={logo} alt="Saiban" width={112} height={88} className="h-9 w-auto shrink-0 object-contain sm:h-11" priority />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-5 text-slate-600 sm:text-sm">Saiban Orphan Support</p>
                <p className="truncate text-xs text-slate-500">{session?.user?.name ?? session?.user?.email ?? 'Signed in'}</p>
              </div>
            </div>
          </div>

          <nav className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center sm:gap-1">
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
            {isFieldWorker ? <HeaderHelpMenu className="w-full sm:w-auto" /> : null}
            <SignOutButton className={signOutClass} />
          </nav>
        </div>
      </header>

      <div className={`mx-auto ${maxWidth} px-4 py-6 sm:px-8 sm:py-8`}>
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">{actions}</div> : null}
        </section>

        {children}
      </div>
    </main>
  );
}

