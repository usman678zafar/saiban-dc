import { applicationStatusLabel } from '@/lib/application-workflow';

type TimelineActor = {
  name: string | null;
  role: string;
  fieldWorkerId: string | null;
};

type TimelineAuditLog = {
  id: string;
  action: string;
  details: unknown;
  createdAt: Date;
  actor: TimelineActor;
};

interface ApplicationActivityTimelineProps {
  createdAt: Date;
  updatedAt: Date;
  status: string;
  createdByName?: string | null;
  auditLogs: TimelineAuditLog[];
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function detailsObject(details: unknown) {
  return details && typeof details === 'object' && !Array.isArray(details) ? details as Record<string, unknown> : {};
}

function actorLabel(actor?: TimelineActor, fallback?: string | null) {
  if (!actor) return fallback || 'System';
  return actor.name || actor.fieldWorkerId || actor.role.replace(/_/g, ' ');
}

function actionLabel(action: string, details: Record<string, unknown>) {
  switch (action) {
    case 'submitted':
      return 'Submitted';
    case 'resubmitted':
      return 'Resubmitted';
    case 'returned_by_supervisor':
      return 'Returned by supervisor';
    case 'returned_by_super_admin':
      return 'Returned by super admin';
    case 'approved_by_supervisor':
      return 'Approved by supervisor';
    case 'supervisor_approved_by_super_admin':
      return 'Approved by super admin';
    case 'rejected_by_supervisor':
      return 'Rejected by supervisor';
    case 'approved_by_reviewer':
      return 'Approved by reviewer';
    case 'reviewer_approved_by_super_admin':
      return 'Approved by super admin';
    case 'rejected_by_reviewer':
      return 'Rejected by reviewer';
    case 'approved_by_admin':
      return 'Approved by admin';
    case 'approved_by_super_admin':
      return 'Approved by super admin';
    case 'rejected_by_admin':
      return 'Rejected by admin';
    case 'rejected_by_super_admin':
      return 'Rejected by super admin';
    case 'status_changed_by_admin':
    case 'status_changed_by_super_admin':
    case 'status_changed':
      return typeof details.to === 'string' ? `Moved to ${applicationStatusLabel(details.to)}` : 'Status changed';
    case 'edited_by_reviewer':
      return 'Edited by reviewer';
    case 'edited_by_admin':
      return 'Edited by admin';
    case 'edited_by_super_admin':
      return 'Edited by super admin';
    default:
      return action.replace(/_/g, ' ');
  }
}

function statusLine(details: Record<string, unknown>) {
  const from = typeof details.from === 'string' ? applicationStatusLabel(details.from) : null;
  const to = typeof details.to === 'string' ? applicationStatusLabel(details.to) : null;
  if (!from || !to) return null;
  return `${from} to ${to}`;
}

function hasSubmittedEntry(auditLogs: TimelineAuditLog[]) {
  return auditLogs.some((log) => {
    const details = detailsObject(log.details);
    return log.action === 'submitted' || log.action === 'resubmitted' || details.to === 'submitted';
  });
}

export default function ApplicationActivityTimeline({ createdAt, updatedAt, status, createdByName, auditLogs }: ApplicationActivityTimelineProps) {
  const shouldShowLegacySubmit = status !== 'draft' && !hasSubmittedEntry(auditLogs);
  const items = [
    {
      id: 'created',
      title: 'Draft created',
      actor: createdByName || 'Field worker',
      createdAt,
      detail: null as string | null,
      comment: null as string | null,
    },
    ...(shouldShowLegacySubmit ? [{
      id: 'legacy-submitted',
      title: 'Submitted',
      actor: createdByName || 'Field worker',
      createdAt: updatedAt,
      detail: 'Submission recorded before activity tracking was added',
      comment: null as string | null,
    }] : []),
    ...auditLogs.map((log) => {
      const details = detailsObject(log.details);
      const comment = typeof details.comment === 'string' && details.comment.trim() ? details.comment.trim() : null;
      return {
        id: log.id,
        title: actionLabel(log.action, details),
        actor: actorLabel(log.actor),
        createdAt: log.createdAt,
        detail: statusLine(details),
        comment,
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold leading-6 text-slate-900">Activity</h2>
      <ol className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={item.id} className="border-l-2 border-slate-200 pl-3">
            <div className="flex flex-col gap-1">
              <p className="break-words text-sm font-semibold leading-5 text-slate-900 [overflow-wrap:anywhere]">{item.title}</p>
              <p className="text-xs leading-5 text-slate-500">
                {dateTimeFormatter.format(new Date(item.createdAt))} by {item.actor}
              </p>
              {item.detail ? <p className="text-xs leading-5 text-slate-600">{item.detail}</p> : null}
              {item.comment ? (
                <p className="mt-1 break-words rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 [overflow-wrap:anywhere]">
                  {item.comment}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
