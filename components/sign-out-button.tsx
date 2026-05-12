'use client';

import { signOut } from 'next-auth/react';

interface SignOutButtonProps {
  className?: string;
}

export default function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/signin' })}
      className={className ?? 'rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300'}
    >
      Sign Out
    </button>
  );
}
