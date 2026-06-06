'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type BackButtonProps = {
  fallbackHref: string;
  children?: ReactNode;
  className?: string;
};

export default function BackButton({ fallbackHref, children = 'Back', className }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        const referrer = document.referrer ? new URL(document.referrer) : null;
        if (window.history.length > 1 && referrer?.origin === window.location.origin) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
