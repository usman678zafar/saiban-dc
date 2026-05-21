'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ArrowRight, RotateCcw } from 'lucide-react';
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
  actorRole?: 'admin' | 'reviewer' | 'supervisor' | 'field_worker';
  onUpdated?: () => void;
}

const actionButtons: Record<'admin' | 'reviewer' | 'supervisor' | 'field_worker', WorkflowAction[]> = {
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
    { from: 'reviewer_approved', to: 'admin_approved', label: 'Final Approve', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
    { from: 'reviewer_approved', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
    { from: 'admin_approved', to: 'migrated', label: 'Migrate', icon: RotateCcw, color: 'bg-slate-800 hover:bg-slate-700' },
    { from: 'validated', to: 'migrated', label: 'Migrate Legacy Validated', icon: RotateCcw, color: 'bg-slate-800 hover:bg-slate-700' },
  ],
  field_worker: [
    { from: 'needs_correction', to: 'submitted', label: 'Resubmit Application', icon: ArrowRight, color: 'bg-blue-600 hover:bg-blue-500' },
  ],
};

const redirectAfterAction: Record<'admin' | 'reviewer' | 'supervisor' | 'field_worker', string> = {
  admin: '/admin/applications',
  reviewer: '/reviewer',
  supervisor: '/supervisor',
  field_worker: '/applications',
};

export default function ApplicationStatusActions({ applicationId, currentStatus, actorRole = 'admin', onUpdated }: ApplicationStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const handleTransition = async (newStatus: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: applicationId, status: newStatus, reviewComment: comment }),
      });

      if (!response.ok) {
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

  const availableActions = actionButtons[actorRole].filter((action) => action.from === currentStatus);

  if (availableActions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
        No status transitions available for this application.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold leading-7 text-slate-900">{actorRole === 'supervisor' ? 'Supervisor Actions' : actorRole === 'reviewer' ? 'Reviewer Actions' : actorRole === 'field_worker' ? 'Correction Actions' : 'Admin Actions'}</h3>
      <p className="text-sm leading-6 text-slate-600">Current status: {applicationStatusLabel(currentStatus)}.</p>
      {availableActions.some((action) => action.requiresComment) ? (
        <label className="grid gap-2 text-sm text-slate-700">
          <span>Correction comment</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            className="resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Explain what the field worker needs to correct."
          />
        </label>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        {availableActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.to}
              type="button"
              onClick={() => handleTransition(action.to)}
              disabled={loading || (action.requiresComment && !comment.trim())}
              className={`${action.color} inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {action.label}
            </button>
          );
        })}
      </div>
      {message ? <p className="break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{message}</p> : null}
    </div>
  );
}

