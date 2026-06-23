import Link from 'next/link';
import { AlertTriangle, UsersRound } from 'lucide-react';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { formatDate } from '@/lib/date-format';
import type { SameFamilyApplicationListItem, SameFamilySummary } from '@/lib/same-family-applications';

const statusTone: Record<string, string> = {
  admin_on_hold: 'bg-amber-100 text-amber-800',
  admin_approved: 'bg-emerald-100 text-emerald-800',
  validated: 'bg-emerald-100 text-emerald-800',
  migrated: 'bg-slate-100 text-slate-700',
  rejected: 'bg-rose-100 text-rose-800',
};

export function SameFamilyBadge({ summary }: { summary?: SameFamilySummary }) {
  if (!summary?.count) return null;

  const approvedCount = (summary.statuses.admin_approved ?? 0) + (summary.statuses.validated ?? 0) + (summary.statuses.migrated ?? 0);
  const holdCount = summary.statuses.admin_on_hold ?? 0;
  const tone = holdCount ? 'border-amber-200 bg-amber-50 text-amber-800' : approvedCount ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-blue-200 bg-blue-50 text-blue-800';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
      Same family: {summary.count + 1} orphans
    </span>
  );
}

export default function SameFamilyApplicationsPanel({
  applications,
  hrefPrefix,
}: {
  applications: SameFamilyApplicationListItem[];
  hrefPrefix: string;
}) {
  if (applications.length === 0) return null;

  const holdCount = applications.filter((application) => application.status === 'admin_on_hold').length;
  const approvedCount = applications.filter((application) => ['admin_approved', 'validated', 'migrated'].includes(application.status)).length;
  const rejectedCount = applications.filter((application) => application.status === 'rejected').length;

  return (
    <section className="min-w-0 rounded-lg border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6 text-slate-900">Same Family Applications</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {applications.length} related orphan {applications.length === 1 ? 'application was' : 'applications were'} found. Review them before approval; hold this application if verification is needed.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {approvedCount ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{approvedCount} approved/migrated</span> : null}
        {holdCount ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{holdCount} on hold</span> : null}
        {rejectedCount ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">{rejectedCount} rejected</span> : null}
      </div>

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
    </section>
  );
}
