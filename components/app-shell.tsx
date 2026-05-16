import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SignOutButton from './sign-out-button';
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
  const isAdmin = session?.user?.role === 'admin';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className={`mx-auto flex flex-col gap-3 ${maxWidth} px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6`}>
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Image src={logo} alt="Saiban" width={112} height={88} className="h-8 w-auto shrink-0 object-contain sm:h-11" priority />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 sm:text-sm">Saiban Orphan Support</p>
                <p className="truncate text-xs text-slate-500">{session?.user?.name ?? session?.user?.email ?? 'Signed in'}</p>
              </div>
            </div>
          </div>

          <nav className="-mx-1 flex snap-x items-center gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:pb-0">
            {isAdmin ? (
              <Link href="/dashboard" className="snap-start whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:px-3 sm:py-2.5 sm:text-sm">
                Dashboard
              </Link>
            ) : null}
            <Link href="/applications" className="snap-start whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:px-3 sm:py-2.5 sm:text-sm">
              Applications
            </Link>
            <Link href="/applications/new" className="snap-start whitespace-nowrap rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 sm:px-3 sm:py-2.5 sm:text-sm">
              New Application
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="snap-start whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:px-3 sm:py-2.5 sm:text-sm">
                Admin
              </Link>
            ) : null}
            <SignOutButton className="snap-start whitespace-nowrap rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 sm:px-3 sm:py-2.5 sm:text-sm" />
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
