'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';

interface BulkDeleteApplicationsButtonProps {
  formId: string;
  visibleDraftCount: number;
}

export default function BulkDeleteApplicationsButton({ formId, visibleDraftCount }: BulkDeleteApplicationsButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const draftCheckboxes = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return [] as HTMLInputElement[];

    return Array.from(form.querySelectorAll<HTMLInputElement>('input[name="applicationId"][data-draft-select="true"]'));
  };

  const selectedApplicationIds = () => Array.from(
    new Set(
      draftCheckboxes()
        .filter((input) => input.checked)
        .map((input) => input.value)
        .filter(Boolean),
    ),
  );

  const refreshSelectionState = () => {
    const count = selectedApplicationIds().length;
    setSelectedCount(count);

    if (selectAllRef.current) {
      selectAllRef.current.checked = visibleDraftCount > 0 && count === visibleDraftCount;
      selectAllRef.current.indeterminate = count > 0 && count < visibleDraftCount;
    }
  };

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;

    const handleFormChange = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      if (target?.matches('input[name="applicationId"][data-draft-select="true"]')) {
        draftCheckboxes()
          .filter((input) => input.value === target.value)
          .forEach((input) => {
            input.checked = target.checked;
          });
      }
      refreshSelectionState();
    };

    refreshSelectionState();
    form.addEventListener('change', handleFormChange);
    return () => form.removeEventListener('change', handleFormChange);
  }, [formId, visibleDraftCount]);

  const setAllVisibleDrafts = (checked: boolean) => {
    draftCheckboxes().forEach((input) => {
      input.checked = checked;
    });
    refreshSelectionState();
  };

  const handleSelectAll = (event: ChangeEvent<HTMLInputElement>) => {
    setAllVisibleDrafts(event.target.checked);
  };

  const handleDelete = async () => {
    const ids = selectedApplicationIds();
    if (ids.length === 0) return;

    const expectedConfirmation = `DELETE ${ids.length}`;
    const confirmation = window.prompt(
      `This will permanently delete ${ids.length} selected draft application${ids.length === 1 ? '' : 's'}, including uploaded R2 files. Type ${expectedConfirmation} to continue.`,
    );

    if (confirmation !== expectedConfirmation) return;

    setIsDeleting(true);
    const failures: string[] = [];

    for (const id of ids) {
      try {
        const response = await fetch('/api/applications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          failures.push(`${id}: ${result?.message ?? 'Delete failed'}`);
        }
      } catch (error) {
        failures.push(`${id}: ${error instanceof Error ? error.message : 'Delete failed'}`);
      }
    }

    setIsDeleting(false);

    if (failures.length > 0) {
      window.alert(`Deleted ${ids.length - failures.length} of ${ids.length} applications.\n\nFailures:\n${failures.join('\n')}`);
    } else {
      window.alert(`Deleted ${ids.length} selected draft application${ids.length === 1 ? '' : 's'}.`);
    }

    router.refresh();
  };

  if (visibleDraftCount === 0) return null;

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-lg border border-[#dbe4ef] bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 text-sm font-semibold text-[#0f1f33]">
          <input
            ref={selectAllRef}
            type="checkbox"
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
          />
          Select all visible drafts
        </label>
        <span className="text-sm font-medium text-[#5f718a]">
          {selectedCount === 0
            ? `${visibleDraftCount} draft${visibleDraftCount === 1 ? '' : 's'} available on this page`
            : `${selectedCount} selected`}
        </span>
      </div>

      {selectedCount > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setAllVisibleDrafts(false)}
            disabled={isDeleting}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#dbe4ef] px-3 text-sm font-semibold text-[#506784] hover:bg-[#f6f9fd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {isDeleting ? 'Deleting...' : `Delete ${selectedCount} draft${selectedCount === 1 ? '' : 's'}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
