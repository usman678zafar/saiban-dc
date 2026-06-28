'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LogOut, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import SignOutButton from './sign-out-button';
import logo from '@/assests/logo.png';

export type PortalMobileMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

interface PortalMobileMenuProps {
  currentLabel: string;
  navItems: PortalMobileMenuItem[];
  portalLabel: string;
  portalCaption?: string;
  profileLabel: string;
  profileMeta?: string;
  signOutLabel: string;
  menuLabel: string;
  closeLabel: string;
  dir?: 'ltr' | 'rtl';
}

export default function PortalMobileMenu({
  currentLabel,
  navItems,
  portalLabel,
  portalCaption,
  profileLabel,
  profileMeta,
  signOutLabel,
  menuLabel,
  closeLabel,
  dir = 'ltr',
}: PortalMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const profileInitial = profileLabel.trim().charAt(0).toUpperCase() || 'S';

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [currentLabel]);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-[#dbe4ef] bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur lg:hidden">
        <div className={clsx('mx-auto flex h-16 items-center justify-between gap-3 px-3 sm:px-4', dir === 'rtl' && 'flex-row-reverse')}>
          <div className={clsx('flex min-w-0 items-center gap-3', dir === 'rtl' && 'flex-row-reverse')}>
            <Image src={logo} alt="Saiban" width={80} height={56} className="h-10 w-auto shrink-0 object-contain" priority />
            <div className={clsx('min-w-0', dir === 'rtl' && 'text-right')}>
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b8ca3]" dir={dir}>{portalLabel}</p>
              <p className="truncate text-sm font-semibold text-[#0f1f33]" dir={dir}>{currentLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={menuLabel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dbe4ef] bg-[#f8fbff] text-[#0f1f33] shadow-sm transition hover:bg-[#eef4ff]"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
          />
          <aside
            className={clsx(
              'absolute inset-y-0 w-[min(20rem,86vw)] overflow-y-auto border-[#dbe4ef] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]',
              dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
            )}
            aria-label={portalLabel}
          >
            <div className="border-b border-[#e5ebf3] px-4 py-4">
              <div className={clsx('flex items-start justify-between gap-3', dir === 'rtl' && 'flex-row-reverse')}>
                <div className={clsx('flex min-w-0 items-center gap-3', dir === 'rtl' && 'flex-row-reverse')}>
                  <Image src={logo} alt="Saiban" width={100} height={72} className="h-14 w-auto shrink-0 object-contain" priority />
                  <div className={clsx('min-w-0', dir === 'rtl' && 'text-right')}>
                    <p className="truncate text-sm font-semibold text-[#0f1f33]" dir={dir}>{portalLabel}</p>
                    {portalCaption ? <p className="mt-1 text-xs text-[#63758d]" dir={dir}>{portalCaption}</p> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={closeLabel}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#f4f7fb] hover:text-[#0f1f33]"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className={clsx('mb-4 flex min-w-0 items-center gap-3 rounded-2xl border border-[#e5ebf3] bg-[#f8fbff] p-3', dir === 'rtl' && 'flex-row-reverse')}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dceaff] text-sm font-bold text-[#2563eb]">
                  {profileInitial}
                </span>
                <div className={clsx('min-w-0', dir === 'rtl' && 'text-right')}>
                  {profileMeta ? <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b8ca3]" dir={dir}>{profileMeta}</p> : null}
                  <p className="mt-0.5 truncate text-sm font-semibold text-[#0f1f33]">{profileLabel}</p>
                </div>
              </div>

              <nav className="grid gap-1.5" aria-label={portalLabel}>
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={item.active ? 'page' : undefined}
                      className={clsx(
                        'flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold transition-colors',
                        dir === 'rtl' ? 'flex-row-reverse gap-3 text-right' : 'gap-3',
                        item.active ? 'bg-[#eaf2ff] text-[#2563eb]' : 'text-[#52657d] hover:bg-[#f4f7fb] hover:text-[#0f1f33]',
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      <span className="truncate" dir={dir}>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <SignOutButton
                ariaLabel={signOutLabel}
                className={clsx(
                  'mt-4 flex min-h-11 w-full items-center justify-center rounded-2xl px-3 text-sm font-semibold text-[#64748b] transition-colors hover:bg-[#fff1f2] hover:text-[#dc2626]',
                  dir === 'rtl' ? 'flex-row-reverse gap-2.5' : 'gap-2.5',
                )}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span dir={dir}>{signOutLabel}</span>
              </SignOutButton>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
