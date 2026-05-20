'use client';

import { ReactNode, useState } from 'react';
import { signOut } from 'next-auth/react';
import { useNavigationLoading } from './navigation-loading';

interface SignOutButtonProps {
  className?: string;
  children?: ReactNode;
}

export default function SignOutButton({ className, children }: SignOutButtonProps) {
  const { startLoading, stopLoading } = useNavigationLoading();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    startLoading();
    try {
      await signOut({ callbackUrl: '/signin' });
    } catch {
      setIsSigningOut(false);
      stopLoading();
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={className ?? 'rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300'}
    >
      {isSigningOut ? 'Signing out...' : children ?? 'Sign Out'}
    </button>
  );
}

