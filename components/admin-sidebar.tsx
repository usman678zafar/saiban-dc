import Image from 'next/image';
import Link from 'next/link';
import SignOutButton from './sign-out-button';
import logo from '@/assests/logo.png';

interface AdminSidebarProps {
  email?: string | null;
}

export default function AdminSidebar({ email }: AdminSidebarProps) {
  return (
    <aside className="w-60 border-b border-slate-200 bg-white px-6 py-6 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:flex lg:flex-col">
      <div className="flex items-center gap-4">
        <Image src={logo} alt="Saiban" width={128} height={100} className="h-16 w-auto object-contain" priority />
      </div>

      <nav className="mt-8 grid gap-2 flex-grow">
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

      <div className="mt-auto border-t border-slate-200 pt-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Admin Portal</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
          </div>
        </div>
        <SignOutButton className="w-full rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200" />
      </div>
    </aside>
  );
}
