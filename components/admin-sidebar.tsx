import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import SignOutButton from './sign-out-button';
import logo from '@/assests/logo.png';

interface AdminSidebarProps {
  email?: string | null;
}

export default function AdminSidebar({ email }: AdminSidebarProps) {
  return (
    <aside className="w-60 border-b border-slate-200 bg-white px-6 py-6 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:flex lg:flex-col lg:w-60 fixed bottom-0 left-0 right-0 z-50 lg:relative lg:px-6 lg:py-6 px-4 py-3 border-t lg:border-t-0">
      <div className="hidden lg:flex items-center gap-4">
        <Image src={logo} alt="Saiban" width={128} height={100} className="h-16 w-auto object-contain" priority />
      </div>

      <nav className="hidden lg:mt-8 lg:grid lg:gap-2 lg:flex-grow">
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

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden flex justify-around items-center">
        <Link href="/admin" className="flex flex-col items-center p-2 text-xs text-slate-600 hover:text-slate-900">
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Overview</span>
        </Link>
        <Link href="/admin/applications" className="flex flex-col items-center p-2 text-xs text-slate-600 hover:text-slate-900">
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Apps</span>
        </Link>
        <Link href="/admin/applications/new" className="flex flex-col items-center p-2 text-xs text-slate-600 hover:text-slate-900">
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New</span>
        </Link>
        <Link href="/admin/field-workers" className="flex flex-col items-center p-2 text-xs text-slate-600 hover:text-slate-900">
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Workers</span>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/signin' })}
          className="flex flex-col items-center p-2 text-xs text-slate-600 hover:text-slate-900"
        >
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </nav>

      <div className="hidden lg:mt-auto lg:border-t lg:border-slate-200 lg:pt-6">
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
