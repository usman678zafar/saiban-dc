'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';

const underReviewStatuses = new Set(['submitted', 'supervisor_approved', 'reviewer_approved']);
const approvedStatuses = new Set(['admin_approved', 'validated']);

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Under Review',
  needs_correction: 'Correction Required',
  supervisor_approved: 'Under Review',
  reviewer_approved: 'Under Review',
  admin_approved: 'Approved',
  validated: 'Approved',
  rejected: 'Not Approved',
  migrated: 'Migrated',
};

const statusClasses: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-50 text-blue-700 ring-blue-100',
  needs_correction: 'bg-amber-50 text-amber-800 ring-amber-100',
  supervisor_approved: 'bg-blue-50 text-blue-700 ring-blue-100',
  reviewer_approved: 'bg-blue-50 text-blue-700 ring-blue-100',
  admin_approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  validated: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
  migrated: 'bg-slate-100 text-slate-700 ring-slate-100',
};

const underReviewHelp =
  'Your application is being reviewed. This may take 20 to 30 days. Please check this portal from time to time. If correction is required, you will see it here. If approved, further processing will begin.';

function getStatusHelp(status: string) {
  if (underReviewStatuses.has(status)) return underReviewHelp;
  if (status === 'needs_correction') return 'Correction is required. Please open the application, edit the requested information, and resubmit it for review.';
  if (approvedStatuses.has(status)) return 'Your application is correctly filled and approved. We will contact you soon for the next phases.';
  return null;
}

export function volunteerApplicationStatusLabel(status: string) {
  return statusLabels[status] ?? status.replace(/_/g, ' ');
}

export default function VolunteerApplicationStatus({ status }: { status: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const label = volunteerApplicationStatusLabel(status);
  const className = statusClasses[status] ?? 'bg-slate-100 text-slate-700 ring-slate-100';
  const helpText = getStatusHelp(status);

  return (
    <span className="relative inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${className}`}>
        {label}
      </span>
      {helpText ? (
        <button
          type="button"
          aria-label={`${label} information`}
          aria-expanded={isOpen}
          title={helpText}
          onClick={() => setIsOpen((current) => !current)}
          onBlur={() => setIsOpen(false)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
      {helpText && isOpen ? (
        <span className="absolute left-0 top-8 z-20 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-lg">
          {helpText}
        </span>
      ) : null}
    </span>
  );
}
