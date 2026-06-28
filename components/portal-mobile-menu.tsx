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
        <div className={clsx('mx-auto flex h-15 items-center justify-between gap-2.5 px-3 sm:h-16 sm:gap-3 sm:px-4', dir === 'rtl' && 'flex-row-reverse')}>
          <div className={clsx('flex min-w-0 items-center gap-2.5', dir === 'rtl' && 'flex-row-reverse')}>
            <Image src={logo} alt="Saiban" width={72} height={52} className="h-8 w-auto shrink-0 object-contain sm:h-10" priority />
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
              'absolute inset-y-0 w-[min(15.75rem,78vw)] overflow-y-auto border-[#dbe4ef] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:w-[min(17.5rem,82vw)]',
              dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
            )}
            aria-label={portalLabel}
          >
            <div className="border-b border-[#e5ebf3] px-3 py-3 sm:px-4 sm:py-4">
              <div className={clsx('flex items-start justify-between gap-2.5 sm:gap-3', dir === 'rtl' && 'flex-row-reverse')}>
                <div className={clsx('flex min-w-0 items-center gap-2.5 sm:gap-3', dir === 'rtl' && 'flex-row-reverse')}>
                  <Image src={logo} alt="Saiban" width={84} height={58} className="h-10 w-auto shrink-0 object-contain sm:h-14" priority />
                  <div className={clsx('min-w-0', dir === 'rtl' && 'text-right')}>
                    <p className="truncate text-sm font-semibold text-[#0f1f33]" dir={dir}>{portalLabel}</p>
                    {portalCaption ? <p className="mt-0.5 text-[11px] leading-4 text-[#63758d] sm:text-xs sm:leading-5" dir={dir}>{portalCaption}</p> : null}
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

            <div className="flex h-full min-h-0 flex-col p-3 sm:p-4">
              <nav className="grid gap-1" aria-label={portalLabel}>
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={item.active ? 'page' : undefined}
                      className={clsx(
                        'flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition-colors sm:min-h-11 sm:rounded-2xl',
                        dir === 'rtl' ? 'flex-row-reverse gap-2.5 text-right sm:gap-3' : 'gap-2.5 sm:gap-3',
                        item.active ? 'bg-[#eaf2ff] text-[#2563eb]' : 'text-[#52657d] hover:bg-[#f4f7fb] hover:text-[#0f1f33]',
                      )}
                    >
                      <Icon className="h-[17px] w-[17px] shrink-0 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
                      <span className="truncate" dir={dir}>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4">
                <div className={clsx('mb-3 flex min-w-0 items-center gap-2 rounded-2xl border border-[#e5ebf3] bg-[#f8fbff] p-2 sm:mb-4 sm:gap-3 sm:p-3', dir === 'rtl' && 'flex-row-reverse')}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dceaff] text-sm font-bold text-[#2563eb] sm:h-10 sm:w-10">
                    {profileInitial}
                  </span>
                  <div className={clsx('min-w-0', dir === 'rtl' && 'text-right')}>
                    {profileMeta ? <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b8ca3]" dir={dir}>{profileMeta}</p> : null}
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-[#0f1f33] sm:text-sm">{profileLabel}</p>
                  </div>
                </div>

                <SignOutButton
                  ariaLabel={signOutLabel}
                  className={clsx(
                    'flex min-h-10 w-full items-center justify-center rounded-xl px-3 text-sm font-semibold text-[#64748b] transition-colors hover:bg-[#fff1f2] hover:text-[#dc2626] sm:min-h-11 sm:rounded-2xl',
                    dir === 'rtl' ? 'flex-row-reverse gap-2.5' : 'gap-2.5',
                  )}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span dir={dir}>{signOutLabel}</span>
                </SignOutButton>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
