import Link from 'next/link';
import { Baby, ChevronDown, UsersRound } from 'lucide-react';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { formatDate } from '@/lib/date-format';
import type { SameFamilyApplicationListItem, SameFamilySummary } from '@/lib/same-family-applications';
import SameFamilyApplicationsModal from './same-family-applications-modal';

const statusTone: Record<string, string> = {
  admin_on_hold: 'bg-amber-100 text-amber-800',
  admin_approved: 'bg-emerald-100 text-emerald-800',
  validated: 'bg-emerald-100 text-emerald-800',
  migrated: 'bg-slate-100 text-slate-700',
  rejected: 'bg-rose-100 text-rose-800',
};

function modalItem(application: SameFamilyApplicationListItem): SameFamilyApplicationListItem {
  return {
    id: application.id,
    registrationNumber: application.registrationNumber,
    childName: application.childName,
    age: application.age,
    status: application.status,
    updatedAt: application.updatedAt instanceof Date ? application.updatedAt.toISOString() : application.updatedAt,
    fatherName: application.fatherName,
    fatherCnic: application.fatherCnic,
    motherName: application.motherName,
    motherCnic: application.motherCnic,
    motherIsGuardian: application.motherIsGuardian,
    guardianName: application.guardianName,
    guardianCnic: application.guardianCnic,
  };
}

export function SameFamilyBadge({
  summary,
  currentStatus,
  modalApplications,
  currentApplicationId,
  hrefPrefix = '/admin/applications',
  actorRole,
}: {
  summary?: SameFamilySummary;
  currentStatus: SameFamilyApplicationListItem['status'];
  modalApplications?: SameFamilyApplicationListItem[];
  currentApplicationId?: string;
  hrefPrefix?: string;
  actorRole?: 'admin' | 'super_admin';
}) {
  if (!summary?.count) return null;

  const relatedApprovedCount = (summary.statuses.admin_approved ?? 0) + (summary.statuses.validated ?? 0) + (summary.statuses.migrated ?? 0);
  const currentApplicationIsApproved = ['admin_approved', 'validated', 'migrated'].includes(currentStatus);
  const approvedCount = relatedApprovedCount + (currentApplicationIsApproved ? 1 : 0);
  const tone = approvedCount > 1
    ? 'border-amber-300 bg-amber-50 text-amber-800'
    : approvedCount === 1
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : 'border-blue-200 bg-blue-50 text-blue-800';

  const label = `Same family: ${summary.count + 1} orphans`;

  if (actorRole && currentApplicationId && modalApplications && modalApplications.length > 1) {
    const serializedApplications = modalApplications.map(modalItem);

    return (
      <SameFamilyApplicationsModal
        applications={serializedApplications}
        currentApplicationId={currentApplicationId}
        hrefPrefix={hrefPrefix}
        actorRole={actorRole}
        triggerLabel={label}
        triggerClassName={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone} hover:bg-white/60`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function SameFamilyApplicationsPanel({
  applications,
  hrefPrefix,
  defaultCollapsed = true,
  currentApplication,
  actorRole,
}: {
  applications: SameFamilyApplicationListItem[];
  hrefPrefix: string;
  defaultCollapsed?: boolean;
  currentApplication?: SameFamilyApplicationListItem;
  actorRole?: 'admin' | 'super_admin';
}) {
  if (applications.length === 0) return null;

  const modalApplications = currentApplication ? [currentApplication, ...applications] : applications;
  const serializedModalApplications = modalApplications.map(modalItem);

  const holdCount = applications.filter((application) => application.status === 'admin_on_hold').length;
  const approvedCount = applications.filter((application) => ['admin_approved', 'validated', 'migrated'].includes(application.status)).length;
  const rejectedCount = applications.filter((application) => application.status === 'rejected').length;
  const relatedOrphanLabel = `${applications.length} other orphan ${applications.length === 1 ? 'record' : 'records'} found`;

  return (
    <details className="group min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" open={!defaultCollapsed}>
      <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
            <Baby className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-5 text-slate-950">Other Orphans in This Family</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">{relatedOrphanLabel}</p>
          </div>
        </div>
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md text-slate-400 transition group-hover:bg-white group-hover:text-slate-700">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>

      <div className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {approvedCount ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{approvedCount} approved/migrated</span> : null}
          {holdCount ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{holdCount} on hold</span> : null}
          {rejectedCount ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">{rejectedCount} rejected</span> : null}
        </div>

        {actorRole && currentApplication ? (
          <div className="mt-4">
            <SameFamilyApplicationsModal
              applications={serializedModalApplications}
              currentApplicationId={currentApplication.id}
              hrefPrefix={hrefPrefix}
              actorRole={actorRole}
              triggerLabel={`Compare ${modalApplications.length} orphan records`}
              triggerClassName="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500"
            />
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {applications.map((application) => (
            <Link
              key={application.id}
              href={`${hrefPrefix}/${application.id}`}
              className="block rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-5 text-slate-900 [overflow-wrap:anywhere]">
                    {application.registrationNumber ?? application.id}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{application.childName ?? 'No orphan name'}</p>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[application.status] ?? 'bg-blue-100 text-blue-800'}`}>
                  {applicationStatusLabel(application.status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Updated {formatDate(application.updatedAt)}</p>
            </Link>
          ))}
        </div>
      </div>
    </details>
  );
}
