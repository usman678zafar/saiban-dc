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
        <div className={`mx-auto flex ${maxWidth} flex-col gap-3 px-4 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="flex min-w-0 items-center gap-3">
            <Image src={logo} alt="Saiban" width={112} height={88} className="h-11 w-auto shrink-0 object-contain sm:h-14" priority />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-500">Saiban Orphan Support</p>
              <p className="truncate text-xs text-slate-500">{session?.user?.email ?? 'Signed in'}</p>
            </div>
          </div>

          <nav className="-mx-1 flex snap-x items-center gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:pb-0">
            <Link href="/dashboard" className="snap-start whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Dashboard
            </Link>
            <Link href="/applications" className="snap-start whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Applications
            </Link>
            <Link href="/applications/new" className="snap-start whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
              New Application
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="snap-start whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Admin
              </Link>
            ) : null}
            <SignOutButton className="snap-start whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-200" />
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
