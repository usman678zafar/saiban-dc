'use client';

import { useState } from 'react';
import { Check, X, ArrowRight, RotateCcw } from 'lucide-react';

interface ApplicationStatusActionsProps {
  applicationId: string;
  currentStatus: string;
  onUpdated?: () => void;
}

const actionButtons = [
  { from: 'draft', to: 'submitted', label: 'Submit Application', icon: ArrowRight, color: 'bg-blue-600 hover:bg-blue-500' },
  { from: 'submitted', to: 'validated', label: 'Validate', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
  { from: 'submitted', to: 'rejected', label: 'Reject', icon: X, color: 'bg-rose-600 hover:bg-rose-500' },
  { from: 'validated', to: 'migrated', label: 'Migrate', icon: RotateCcw, color: 'bg-slate-800 hover:bg-slate-700' },
];

export default function ApplicationStatusActions({ applicationId, currentStatus, onUpdated }: ApplicationStatusActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleTransition = async (newStatus: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: applicationId, status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.message ?? 'Status update failed');
      }

      setMessage('Status updated successfully.');
      onUpdated?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Status update failed.');
    } finally {
      setLoading(false);
    }
  };

  const availableActions = actionButtons.filter((action) => action.from === currentStatus);

  if (availableActions.length === 0) {
    return <p className="text-sm text-slate-600">No status transitions available for this application.</p>;
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Admin Actions</h3>
      <p className="text-sm text-slate-600">Change the workflow state for this application.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {availableActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.to}
              type="button"
              onClick={() => handleTransition(action.to)}
              disabled={loading}
              className={`${action.color} inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </button>
          );
        })}
      </div>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
