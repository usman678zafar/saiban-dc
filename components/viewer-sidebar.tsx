'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, ClipboardList, KeyRound, LayoutDashboard, LogOut } from 'lucide-react';
import clsx from 'clsx';
import SignOutButton from './sign-out-button';
import { useViewerLanguage } from './viewer-language';
import logo from '@/assests/logo.png';
import { useSidebarCollapse } from './use-sidebar-collapse';
import type { LucideIcon } from 'lucide-react';
import PortalMobileMenu from './portal-mobile-menu';

interface ViewerSidebarProps {
  email?: string | null;
}

type ViewerLanguage = 'en' | 'ur';
interface ViewerNavItem {
  href: string;
  label: Record<ViewerLanguage, string>;
  mobileLabel: Record<ViewerLanguage, string>;
  icon: LucideIcon;
  exact?: boolean;
}

const navItems: ViewerNavItem[] = [
  { href: '/viewer', label: { en: 'Overview', ur: 'جائزہ' }, mobileLabel: { en: 'Home', ur: 'جائزہ' }, icon: LayoutDashboard, exact: true },
  { href: '/viewer/applications', label: { en: 'Applications', ur: 'درخواستیں' }, mobileLabel: { en: 'Apps', ur: 'درخواستیں' }, icon: ClipboardList },
  { href: '/viewer/account', label: { en: 'Account', ur: 'اکاؤنٹ' }, mobileLabel: { en: 'Acct', ur: 'اکاؤنٹ' }, icon: KeyRound },
];

const sidebarCopy = {
  en: { portal: 'Viewer Portal', readOnly: 'Read Only', signedIn: 'Signed in', signOut: 'Sign Out', mobileSignOut: 'Out' },
  ur: { portal: 'ناظر پورٹل', readOnly: 'صرف دیکھنے کے لیے', signedIn: 'لاگ ان', signOut: 'سائن آؤٹ', mobileSignOut: 'آؤٹ' },
};

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ViewerSidebar({ email }: ViewerSidebarProps) {
  const pathname = usePathname();
  const { language } = useViewerLanguage();
  const { collapsed, setCollapsed } = useSidebarCollapse();
  const t = sidebarCopy[language];
  const profileLabel = email ?? t.signedIn;
  const profileInitial = profileLabel.charAt(0).toUpperCase();

  return (
    <>
      <aside className={clsx('admin-sidebar-scrollbar fixed inset-y-0 left-0 z-40 hidden flex-col overflow-y-auto border-r border-[#dbe4ef] bg-white text-[#0f1f33] shadow-[4px_0_24px_rgba(15,31,51,0.025)] transition-[width] duration-200 lg:flex', collapsed ? 'w-[4.75rem]' : 'w-48')}>
        <div className={clsx('border-b border-[#e5ebf3] text-center', collapsed ? 'px-2 pb-3 pt-4' : 'px-3 pb-4 pt-4')}>
          <Image src={logo} alt="Saiban" width={160} height={125} className={clsx('mx-auto w-auto object-contain transition-[height] duration-200', collapsed ? 'h-11' : 'h-20')} priority />
          {!collapsed && <p className="mt-1 text-[11px] font-medium text-[#63758d]" dir={language === 'ur' ? 'rtl' : 'ltr'}>{t.portal}</p>}
        </div>

        <nav className="grid gap-1 px-2 py-4" aria-label="Viewer navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href, item.exact);

            return (
              <div key={item.href}>
                <Link href={item.href} title={collapsed ? item.label[language] : undefined} aria-current={active ? 'page' : undefined} className={clsx('flex min-h-10 items-center rounded-xl text-xs font-semibold transition-colors', collapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5', active ? 'bg-[#eaf2ff] text-[#2563eb]' : 'text-[#52657d] hover:bg-[#f4f7fb] hover:text-[#0f1f33]')}>
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate" dir={language === 'ur' ? 'rtl' : 'ltr'}>{item.label[language]}</span>}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#e5ebf3] p-2">
          <div className={clsx('mb-2 flex min-w-0 items-center rounded-xl border border-[#e5ebf3] bg-[#f8fafc]', collapsed ? 'justify-center p-2' : 'gap-2.5 p-2.5')}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dceaff] text-xs font-bold text-[#2563eb]">{profileInitial}</span>
            {!collapsed && <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#7b8ca3]" dir={language === 'ur' ? 'rtl' : 'ltr'}>{t.readOnly}</p><p className="mt-0.5 truncate text-xs font-semibold text-[#0f1f33]">{profileLabel}</p></div>}
          </div>
          <SignOutButton ariaLabel={t.signOut} className={clsx('flex min-h-9 w-full items-center justify-center rounded-lg px-2 text-xs font-semibold text-[#64748b] transition-colors hover:bg-[#fff1f2] hover:text-[#dc2626]', !collapsed && 'gap-2')}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {!collapsed && <span dir={language === 'ur' ? 'rtl' : 'ltr'}>{t.signOut}</span>}
          </SignOutButton>
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="mt-1 flex min-h-8 w-full items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-[#f4f7fb] hover:text-[#475569]" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <PortalMobileMenu
        currentLabel={navItems.find((item) => isActivePath(pathname, item.href, item.exact))?.label[language] ?? t.portal}
        navItems={navItems.map((item) => ({
          href: item.href,
          label: item.label[language],
          icon: item.icon,
          active: isActivePath(pathname, item.href, item.exact),
        }))}
        portalLabel={t.portal}
        portalCaption={t.readOnly}
        profileLabel={profileLabel}
        profileMeta={t.readOnly}
        signOutLabel={t.signOut}
        menuLabel={language === 'ur' ? 'مینو کھولیں' : 'Open menu'}
        closeLabel={language === 'ur' ? 'مینو بند کریں' : 'Close menu'}
        dir={language === 'ur' ? 'rtl' : 'ltr'}
      />
    </>
  );
}
