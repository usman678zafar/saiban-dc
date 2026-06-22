export const applicationStatuses = [
  'draft',
  'submitted',
  'needs_correction',
  'supervisor_approved',
  'reviewer_approved',
  'admin_on_hold',
  'admin_approved',
  'validated',
  'rejected',
  'migrated',
] as const;

export type ApplicationStatusValue = (typeof applicationStatuses)[number];

export function applicationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    needs_correction: 'Needs correction',
    supervisor_approved: 'Supervisor approved',
    reviewer_approved: 'Reviewer approved',
    admin_on_hold: 'On Hold',
    admin_approved: 'Admin approved',
    validated: 'Validated',
    rejected: 'Rejected',
    migrated: 'Migrated',
  };

  return labels[status] ?? status.replace(/_/g, ' ');
}

export function badgeClass(status: string) {
  switch (status) {
    case 'submitted':
      return 'bg-blue-100 text-blue-800';
    case 'supervisor_approved':
    case 'reviewer_approved':
    case 'admin_approved':
    case 'validated':
      return 'bg-emerald-100 text-emerald-800';
    case 'admin_on_hold':
      return 'bg-amber-100 text-amber-800';
    case 'migrated':
      return 'bg-violet-100 text-violet-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-800';
    case 'needs_correction':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

