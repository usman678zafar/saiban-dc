'use client';

import { useState } from 'react';

interface ApplicationMigrationFieldsProps {
  applicationId: string;
  initialMigrationStatus: string;
  initialMainSaibanId: string;
  initialMigrationErrors: string;
  onUpdated?: () => void;
}

const migrationOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'validated', label: 'Validated' },
  { value: 'migrated', label: 'Migrated' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ApplicationMigrationFields({ applicationId, initialMigrationStatus, initialMainSaibanId, initialMigrationErrors, onUpdated }: ApplicationMigrationFieldsProps) {
  const [migrationStatus, setMigrationStatus] = useState(initialMigrationStatus || 'pending');
  const [mainSaibanId, setMainSaibanId] = useState(initialMainSaibanId || '');
  const [migrationErrors, setMigrationErrors] = useState(initialMigrationErrors || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveMigrationFields = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicationId,
          migrationStatus,
          mainSaibanId,
          migrationErrors,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.message ?? 'Save failed');
      }

      setMessage('Migration metadata saved.');
      onUpdated?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold leading-7 text-slate-900">Migration Fields</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <label className="grid min-w-0 gap-2 text-sm text-slate-700">
          <span>Status</span>
          <select
            value={migrationStatus}
            onChange={(event) => setMigrationStatus(event.target.value)}
            className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
          >
            {migrationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm text-slate-700">
          <span>Main Saiban ID</span>
          <input
            value={mainSaibanId}
            onChange={(event) => setMainSaibanId(event.target.value)}
            className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
          />
        </label>
      </div>
      <label className="grid min-w-0 gap-2 text-sm text-slate-700">
        <span>Migration Errors</span>
        <textarea
          value={migrationErrors}
          onChange={(event) => setMigrationErrors(event.target.value)}
          className="min-h-[120px] w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
        />
      </label>
      <button
        type="button"
        onClick={saveMigrationFields}
        disabled={isSaving}
        className="min-h-11 w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSaving ? 'Saving…' : 'Save Migration Data'}
      </button>
      {message ? <p className="break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{message}</p> : null}
    </div>
  );
}
