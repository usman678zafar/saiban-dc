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
      <header className="border-b border-slate-200 bg-white">
        <div className={`mx-auto flex ${maxWidth} flex-col gap-4 px-6 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="flex items-center gap-4">
            <Image src={logo} alt="Saiban" width={112} height={88} className="h-14 w-auto object-contain" priority />
            <div>
              <p className="text-sm font-semibold text-slate-500">Saiban Orphan Support</p>
              <p className="text-xs text-slate-500">{session?.user?.email ?? 'Signed in'}</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Dashboard
            </Link>
            <Link href="/applications" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Applications
            </Link>
            <Link href="/applications/new" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              New Application
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Admin
              </Link>
            ) : null}
            <SignOutButton className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200" />
          </nav>
        </div>
      </header>

      <div className={`mx-auto ${maxWidth} px-6 py-8 sm:px-8`}>
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </section>

        {children}
      </div>
    </main>
  );
}
