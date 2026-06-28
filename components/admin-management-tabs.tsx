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
    <div className="admin-management-density mb-6 lg:mb-3">
      <header className="mb-5 lg:mb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl lg:text-xl">Management</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a] lg:mt-1 lg:text-xs lg:leading-5">
          Manage departments, staff accounts, assignments, and administrative access from one place.
        </p>
      </header>

      <nav aria-label="Management sections" className="overflow-x-auto rounded-2xl border border-[#dbe4ef] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,31,51,0.04)] lg:rounded-xl lg:p-1">
        <div className="flex min-w-max gap-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === active;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={selected ? 'page' : undefined}
                className={clsx(
                  'management-tab inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 lg:min-h-9 lg:gap-1.5 lg:rounded-lg lg:px-3 lg:py-1.5 lg:text-xs',
                  selected
                    ? 'bg-[#eaf2ff] text-[#2563eb]'
                    : 'text-[#63758d] hover:bg-[#f4f7fb] hover:text-[#0f1f33]',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
