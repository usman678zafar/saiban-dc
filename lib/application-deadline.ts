export const APPLICATION_COMPLETION_DEADLINE_DAYS = 15;
export const APPLICATION_DELETION_COMPLETION_THRESHOLD = 50;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const submittedWorkflowStatuses = new Set([
  'submitted',
  'supervisor_approved',
  'reviewer_approved',
  'admin_on_hold',
  'admin_approved',
  'validated',
  'rejected',
  'migrated',
]);

export type ApplicationDeadlineInput = {
  createdAt?: Date | string | null;
  status?: string | null;
  completionPercentage?: number | null;
  now?: Date;
};

export type ApplicationDeadlineInfo = {
  createdAt: Date;
  deadlineAt: Date;
  daysLeft: number;
  isExpired: boolean;
  isLowCompletion: boolean;
  isSubmittedWorkflow: boolean;
  isAtRisk: boolean;
  isExemptByCompletion: boolean;
  completionPercentage: number;
};

function validDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getApplicationDeadlineInfo({
  createdAt,
  status,
  completionPercentage,
  now = new Date(),
}: ApplicationDeadlineInput): ApplicationDeadlineInfo | null {
  const created = validDate(createdAt);
  if (!created) return null;

  const completion = typeof completionPercentage === 'number' && Number.isFinite(completionPercentage)
    ? Math.max(0, Math.min(100, Math.round(completionPercentage)))
    : 0;
  const deadlineAt = new Date(created.getTime() + APPLICATION_COMPLETION_DEADLINE_DAYS * MS_PER_DAY);
  const millisecondsLeft = deadlineAt.getTime() - now.getTime();
  const isExpired = millisecondsLeft <= 0;
  const isLowCompletion = completion <= APPLICATION_DELETION_COMPLETION_THRESHOLD;
  const isSubmittedWorkflow = submittedWorkflowStatuses.has(status ?? '');

  return {
    createdAt: created,
    deadlineAt,
    daysLeft: Math.max(0, Math.ceil(millisecondsLeft / MS_PER_DAY)),
    isExpired,
    isLowCompletion,
    isSubmittedWorkflow,
    isAtRisk: !isSubmittedWorkflow && isLowCompletion,
    isExemptByCompletion: !isSubmittedWorkflow && !isLowCompletion,
    completionPercentage: completion,
  };
}

export function shouldDeleteExpiredIncompleteApplication(input: ApplicationDeadlineInput) {
  const info = getApplicationDeadlineInfo(input);
  return Boolean(info?.isAtRisk && info.isExpired && input.status === 'draft');
}
