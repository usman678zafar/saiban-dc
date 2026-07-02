import Link from 'next/link';
import { FolderKanban, MapPin, ShieldCheck, UserCheck, UserCog, UsersRound } from 'lucide-react';
import clsx from 'clsx';

export type AdminManagementSection = 'departments' | 'locations' | 'supervisors' | 'reviewers' | 'field-workers' | 'admins';

interface AdminManagementTabsProps {
  active: AdminManagementSection;
  isSuperAdmin: boolean;
}

const tabs = [
  { id: 'departments', href: '/admin/projects', label: 'Departments', icon: FolderKanban },
  { id: 'locations', href: '/admin/address-options', label: 'Locations', icon: MapPin },
  { id: 'supervisors', href: '/admin/supervisors', label: 'Supervisors', icon: ShieldCheck },
  { id: 'reviewers', href: '/admin/reviewers', label: 'Reviewers', icon: UserCheck },
  { id: 'field-workers', href: '/admin/field-workers', label: 'Field Workers', icon: UsersRound },
  { id: 'admins', href: '/admin/admins', label: 'Admins', icon: UserCog, superAdminOnly: true },
] as const;

export default function AdminManagementTabs({ active, isSuperAdmin }: AdminManagementTabsProps) {
  const visibleTabs = tabs.filter((tab) => !('superAdminOnly' in tab) || isSuperAdmin);

  return (
    <div className="admin-management-density mb-4 lg:mb-3">
      <header className="mb-3 lg:mb-3">
        <h1 className="text-xl font-semibold tracking-tight text-[#0f1f33] sm:text-2xl lg:text-xl">Management</h1>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#5f718a] sm:text-sm lg:text-xs">
          Manage departments, staff accounts, assignments, and administrative access from one place.
        </p>
      </header>

      <nav aria-label="Management sections" className="rounded-xl border border-[#dbe4ef] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,31,51,0.04)] lg:p-1">
        <div className="grid auto-rows-fr grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === active;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={selected ? 'page' : undefined}
                className={clsx(
                  'management-tab inline-flex h-full min-h-10 min-w-0 items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 sm:justify-center sm:px-3 lg:min-h-9 lg:gap-1.5 lg:px-2 lg:py-1.5',
                  selected
                    ? 'bg-[#eaf2ff] text-[#2563eb]'
                    : 'text-[#63758d] hover:bg-[#f4f7fb] hover:text-[#0f1f33]',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="min-w-0 truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
