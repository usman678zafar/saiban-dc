'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Check, X, ArrowRight, RotateCcw, PauseCircle } from 'lucide-react';
import { applicationStatusLabel } from '@/lib/application-workflow';

type WorkflowAction = {
  from: string;
  to: string;
  label: string;
  icon: typeof Check;
  color: string;
  requiresComment?: boolean;
};

interface ApplicationStatusActionsProps {
  applicationId: string;
  currentStatus: string;
  actorRole?: 'super_admin' | 'admin' | 'reviewer' | 'supervisor' | 'field_worker';
  onUpdated?: () => void;
}

const adminWorkflowActions: WorkflowAction[] = [
  { from: 'submitted', to: 'supervisor_approved', label: 'Approve for Reviewer', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
  { from: 'submitted', to: 'needs_correction', label: 'Return with Comment', icon: ArrowRight, color: 'bg-amber-600 hover:bg-amber-500', requiresComment: true },
  { from: 'submitted', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
  { from: 'supervisor_approved', to: 'reviewer_approved', label: 'Approve for Admin', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
  { from: 'supervisor_approved', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
  { from: 'reviewer_approved', to: 'admin_on_hold', label: 'Put On Hold', icon: PauseCircle, color: 'bg-amber-600 hover:bg-amber-500', requiresComment: true },
  { from: 'reviewer_approved', to: 'admin_approved', label: 'Final Approve', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
  { from: 'reviewer_approved', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
  { from: 'admin_on_hold', to: 'admin_approved', label: 'Final Approve', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
  { from: 'admin_on_hold', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
  { from: 'admin_approved', to: 'admin_on_hold', label: 'Put On Hold', icon: PauseCircle, color: 'bg-amber-600 hover:bg-amber-500', requiresComment: true },
  { from: 'admin_approved', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500', requiresComment: true },
  { from: 'admin_approved', to: 'migrated', label: 'Migrate', icon: RotateCcw, color: 'bg-slate-800 hover:bg-slate-700' },
  { from: 'validated', to: 'migrated', label: 'Migrate Legacy Validated', icon: RotateCcw, color: 'bg-slate-800 hover:bg-slate-700' },
];

const actionButtons: Record<'super_admin' | 'admin' | 'reviewer' | 'supervisor' | 'field_worker', WorkflowAction[]> = {
  super_admin: adminWorkflowActions,
  supervisor: [
    { from: 'submitted', to: 'supervisor_approved', label: 'Approve for Reviewer', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
    { from: 'submitted', to: 'needs_correction', label: 'Return with Comment', icon: ArrowRight, color: 'bg-amber-600 hover:bg-amber-500', requiresComment: true },
    { from: 'submitted', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
  ],
  reviewer: [
    { from: 'supervisor_approved', to: 'reviewer_approved', label: 'Approve for Admin', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
    { from: 'supervisor_approved', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
  ],
  admin: [
    { from: 'reviewer_approved', to: 'admin_on_hold', label: 'Put On Hold', icon: PauseCircle, color: 'bg-amber-600 hover:bg-amber-500', requiresComment: true },
    { from: 'reviewer_approved', to: 'admin_approved', label: 'Final Approve', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
    { from: 'reviewer_approved', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
    { from: 'admin_on_hold', to: 'admin_approved', label: 'Final Approve', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
    { from: 'admin_on_hold', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
    { from: 'admin_approved', to: 'admin_on_hold', label: 'Put On Hold', icon: PauseCircle, color: 'bg-amber-600 hover:bg-amber-500', requiresComment: true },
    { from: 'admin_approved', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500', requiresComment: true },
  ],
  field_worker: [
    { from: 'needs_correction', to: 'submitted', label: 'Resubmit Application', icon: ArrowRight, color: 'bg-blue-600 hover:bg-blue-500' },
  ],
};

const redirectAfterAction: Record<'super_admin' | 'admin' | 'reviewer' | 'supervisor' | 'field_worker', string> = {
  super_admin: '/admin/applications',
  admin: '/admin/applications',
  reviewer: '/reviewer/applications',
  supervisor: '/supervisor',
  field_worker: '/applications',
};

function currentSigninUrl() {
  const callbackPath = `${window.location.pathname}${window.location.search}`;
  return `/signin?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

export default function ApplicationStatusActions({ applicationId, currentStatus, actorRole = 'admin', onUpdated }: ApplicationStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnTo, setReturnTo] = useState<'reviewer' | 'supervisor'>('reviewer');
  const [returnComment, setReturnComment] = useState('');

  const handleTransition = async (newStatus: string) => {
    const isApprovedReversal = currentStatus === 'admin_approved' && ['admin_on_hold', 'rejected'].includes(newStatus);
    if (isApprovedReversal && !window.confirm(`Change this approved application to ${applicationStatusLabel(newStatus)}?`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: applicationId, status: newStatus, reviewComment: comment }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setMessage('Your session has expired. Redirecting to sign in...');
          await signOut({ callbackUrl: currentSigninUrl() });
          return;
        }

        const error = await response.json();
        throw new Error(error?.message ?? 'Status update failed');
      }

      setMessage('Status updated successfully.');
      setComment('');
      onUpdated?.();
      router.push(redirectAfterAction[actorRole]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Status update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    const trimmedComment = returnComment.trim();
    if (!trimmedComment) {
      setMessage('Return remarks are required.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicationId,
          status: returnTo === 'supervisor' ? 'submitted' : 'supervisor_approved',
          returnTo,
          reviewComment: trimmedComment,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setMessage('Your session has expired. Redirecting to sign in...');
          await signOut({ callbackUrl: currentSigninUrl() });
          return;
        }

        const error = await response.json();
        throw new Error(error?.message ?? 'Return failed');
      }

      setMessage(`Application returned to ${returnTo}.`);
      setReturnComment('');
      setIsReturnOpen(false);
      onUpdated?.();
      router.push(redirectAfterAction[actorRole]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Return failed.');
    } finally {
      setLoading(false);
    }
  };

  const availableActions = actionButtons[actorRole].filter((action) => action.from === currentStatus);
  const canRouteReturn = (actorRole === 'admin' || actorRole === 'super_admin') && ['reviewer_approved', 'admin_on_hold', 'admin_approved'].includes(currentStatus);
  const acceptsReviewRemarks = actorRole === 'admin' || actorRole === 'reviewer';
  const requiresCorrectionComment = availableActions.some((action) => action.requiresComment);
  const showCommentBox = requiresCorrectionComment || acceptsReviewRemarks;
  const isHoldActionAvailable = availableActions.some((action) => action.to === 'admin_on_hold');
  const isChangingApprovedDecision = currentStatus === 'admin_approved';
  const commentLabel = isChangingApprovedDecision ? 'Required reason for changing approval' : isHoldActionAvailable ? 'Remarks / hold reason' : requiresCorrectionComment ? 'Correction comment' : 'Remarks';
  const commentPlaceholder = isChangingApprovedDecision
    ? 'Explain why this approved application is being put on hold or rejected.'
    : requiresCorrectionComment
    ? isHoldActionAvailable
      ? 'Add remarks, or explain why this application is being held for later or special review.'
      : 'Explain what the field worker needs to correct.'
    : actorRole === 'reviewer'
      ? 'Add reviewer remarks for this decision.'
      : 'Add admin remarks for this decision.';

  if (availableActions.length === 0 && !canRouteReturn) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
        No status transitions available for this application.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold leading-7 text-slate-900">{actorRole === 'supervisor' ? 'Supervisor Actions' : actorRole === 'reviewer' ? 'Reviewer Actions' : actorRole === 'field_worker' ? 'Correction Actions' : actorRole === 'super_admin' ? 'Super Admin Actions' : 'Admin Actions'}</h3>
      <p className="text-sm leading-6 text-slate-600">Current status: {applicationStatusLabel(currentStatus)}.</p>
      {isChangingApprovedDecision ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
          This application is already approved. Hold, return, or rejection will be recorded in its activity history.
        </p>
      ) : null}
      {showCommentBox ? (
        <label className="grid gap-2 text-sm text-slate-700">
          <span>{commentLabel}</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            className="resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={commentPlaceholder}
          />
        </label>
      ) : null}
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {canRouteReturn ? (
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setIsReturnOpen(true);
            }}
            disabled={loading}
            className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-3 text-center text-sm font-semibold leading-5 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4 shrink-0" />
            <span className="whitespace-normal">Return</span>
          </button>
        ) : null}
        {availableActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.to}
              type="button"
              onClick={() => handleTransition(action.to)}
              disabled={loading || (action.requiresComment && !comment.trim())}
              className={`${action.color} inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-3 text-center text-sm font-semibold leading-5 text-white transition disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-normal">{action.label}</span>
            </button>
          );
        })}
      </div>
      {message ? <p className="break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{message}</p> : null}
      {isReturnOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <h4 className="text-base font-semibold text-slate-950">Return application</h4>
              <p className="mt-1 text-sm leading-5 text-slate-600">Choose where this application should go next. Remarks are required and will appear in activity history.</p>
              {isChangingApprovedDecision ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
                  This will change an already approved decision.
                </p>
              ) : null}
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Return to
                <select
                  value={returnTo}
                  onChange={(event) => setReturnTo(event.target.value as 'reviewer' | 'supervisor')}
                  className="min-h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="reviewer">Reviewer</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Required remarks
                <textarea
                  value={returnComment}
                  onChange={(event) => setReturnComment(event.target.value)}
                  rows={4}
                  className="resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder={returnTo === 'supervisor' ? 'Explain what supervisor should verify before sending forward again.' : 'Explain what reviewer should re-check before admin review.'}
                />
              </label>
            </div>
            <div className="grid gap-2 border-t border-slate-100 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <button
                type="button"
                onClick={() => setIsReturnOpen(false)}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={loading || !returnComment.trim()}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Return to {returnTo === 'supervisor' ? 'Supervisor' : 'Reviewer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

