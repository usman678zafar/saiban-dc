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
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Migration Fields</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm text-slate-700">
          <span>Status</span>
          <select
            value={migrationStatus}
            onChange={(event) => setMigrationStatus(event.target.value)}
            className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
          >
            {migrationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          <span>Main Saiban ID</span>
          <input
            value={mainSaibanId}
            onChange={(event) => setMainSaibanId(event.target.value)}
            className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm text-slate-700">
        <span>Migration Errors</span>
        <textarea
          value={migrationErrors}
          onChange={(event) => setMigrationErrors(event.target.value)}
          className="min-h-[120px] rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
        />
      </label>
      <button
        type="button"
        onClick={saveMigrationFields}
        disabled={isSaving}
        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Saving…' : 'Save Migration Data'}
      </button>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
