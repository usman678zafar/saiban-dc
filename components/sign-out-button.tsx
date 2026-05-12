'use client';

import { ReactNode } from 'react';
import { signOut } from 'next-auth/react';

interface SignOutButtonProps {
  className?: string;
  children?: ReactNode;
}

export default function SignOutButton({ className, children }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/signin' })}
      className={className ?? 'rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300'}
    >
      {children ?? 'Sign Out'}
    </button>
  );
}
