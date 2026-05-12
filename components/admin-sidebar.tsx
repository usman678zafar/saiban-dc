import Image from 'next/image';
import Link from 'next/link';
import SignOutButton from './sign-out-button';
import logo from '@/assests/logo.png';

interface AdminSidebarProps {
  email?: string | null;
}

export default function AdminSidebar({ email }: AdminSidebarProps) {
  return (
    <aside className="border-b border-slate-200 bg-white px-6 py-6 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-4">
        <Image src={logo} alt="Saiban" width={128} height={100} className="h-16 w-auto object-contain" priority />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Admin Portal</p>
          <p className="truncate text-xs text-slate-500">{email}</p>
        </div>
      </div>

      <nav className="mt-8 grid gap-2">
        <Link href="/admin" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Overview
        </Link>
        <Link href="/admin/applications" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Applications
        </Link>
        <Link href="/admin/applications/new" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          New Application
        </Link>
        <Link href="/admin/field-workers" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Field Workers
        </Link>
        <Link href="/dashboard" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Field Dashboard
        </Link>
      </nav>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Exports</h2>
        <div className="mt-3 grid gap-2">
          <Link href="/api/applications/export?format=csv" className="rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800">
            Export CSV
          </Link>
          <Link href="/api/applications/export?format=json" className="rounded-lg bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-slate-200">
            Export JSON
          </Link>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <SignOutButton className="w-full rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200" />
      </div>
    </aside>
  );
}
