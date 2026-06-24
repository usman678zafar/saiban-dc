import { AlertTriangle, CheckCircle2, Clock3, ClipboardCheck } from 'lucide-react';
import {
  APPLICATION_COMPLETION_DEADLINE_DAYS,
  APPLICATION_DELETION_COMPLETION_THRESHOLD,
  getApplicationDeadlineInfo,
} from '@/lib/application-deadline';
import { formatDate } from '@/lib/date-format';

type ApplicationDeadlineNoticeProps = {
  createdAt?: Date | string | null;
  status?: string | null;
  completionPercentage?: number | null;
  compact?: boolean;
};

export default function ApplicationDeadlineNotice({
  createdAt,
  status,
  completionPercentage,
  compact = false,
}: ApplicationDeadlineNoticeProps) {
  const info = getApplicationDeadlineInfo({ createdAt, status, completionPercentage });
  if (!info) return null;

  const deadlineLabel = formatDate(info.deadlineAt);

  if (info.isSubmittedWorkflow) {
    if (compact) return null;

    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900 sm:p-4">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="font-semibold text-emerald-950">Application submitted</p>
            <p className="mt-1">
              This application has been submitted or is under review, so it will not be removed automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (info.isExemptByCompletion) {
    if (compact) {
      return (
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold leading-5 text-blue-700">
          <ClipboardCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">Finish & submit - {info.completionPercentage}% complete</span>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900 sm:p-4">
        <div className="flex gap-2.5">
          <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
          <div>
            <p className="font-semibold text-blue-950">Complete this application</p>
            <p className="mt-1">
              This application is {info.completionPercentage}% complete. Please complete and submit it. Applications at {APPLICATION_DELETION_COMPLETION_THRESHOLD}% or less must be submitted within {APPLICATION_COMPLETION_DEADLINE_DAYS} days.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isUrgent = info.daysLeft <= 3;
  const toneClass = info.isExpired || isUrgent
    ? 'border-rose-200 bg-rose-50 text-rose-900'
    : 'border-amber-200 bg-amber-50 text-amber-950';
  const iconClass = info.isExpired || isUrgent ? 'text-rose-700' : 'text-amber-700';

  if (compact) {
    const compactToneClass = info.isExpired || isUrgent
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';
    const compactText = info.isExpired
      ? `Deadline passed - ${info.completionPercentage}% complete`
      : `${info.daysLeft} day${info.daysLeft === 1 ? '' : 's'} left - ${info.completionPercentage}% complete`;

    return (
      <div className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-5 ${compactToneClass}`}>
        {info.isExpired ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0 truncate">{compactText}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 text-sm leading-6 sm:p-4 ${toneClass}`}>
      <div className="flex gap-2.5">
        {info.isExpired ? (
          <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden="true" />
        ) : (
          <Clock3 className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden="true" />
        )}
        <div>
          <p className="font-semibold">
            {info.isExpired ? 'Deadline passed' : `${info.daysLeft} day${info.daysLeft === 1 ? '' : 's'} left to complete and submit`}
          </p>
          <p className="mt-1">
            This application is {info.completionPercentage}% complete. Applications at {APPLICATION_DELETION_COMPLETION_THRESHOLD}% or less must be completed and submitted by {deadlineLabel}, otherwise they will be removed.
          </p>
        </div>
      </div>
    </div>
  );
}
