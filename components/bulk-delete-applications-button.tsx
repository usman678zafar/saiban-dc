'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

interface BulkDeleteApplicationsButtonProps {
  formId: string;
  visibleDraftCount: number;
}

export default function BulkDeleteApplicationsButton({ formId, visibleDraftCount }: BulkDeleteApplicationsButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [confirmationText, setConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!deleteDialogOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => confirmationInputRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        closeDeleteDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteDialogOpen, isDeleting]);

  const setAllVisibleDrafts = (checked: boolean) => {
    draftCheckboxes().forEach((input) => {
      input.checked = checked;
    });
    refreshSelectionState();
  };

  const handleSelectAll = (event: ChangeEvent<HTMLInputElement>) => {
    setAllVisibleDrafts(event.target.checked);
  };

  const openDeleteDialog = () => {
    const ids = selectedApplicationIds();
    if (ids.length === 0) return;

    setPendingDeleteIds(ids);
    setConfirmationText('');
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setPendingDeleteIds([]);
    setConfirmationText('');
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (ids.length === 0 || confirmationText !== `DELETE ${ids.length}`) return;

    setIsDeleting(true);
    setDeleteError(null);
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
      setDeleteError(`Deleted ${ids.length - failures.length} of ${ids.length} applications. ${failures.length} failed: ${failures.join('; ')}`);
      router.refresh();
      return;
    } else {
      setDeleteDialogOpen(false);
      setPendingDeleteIds([]);
      setConfirmationText('');
      setAllVisibleDrafts(false);
    }

    router.refresh();
  };

  if (visibleDraftCount === 0) return null;

  const expectedConfirmation = `DELETE ${pendingDeleteIds.length}`;
  const canConfirmDelete = confirmationText === expectedConfirmation && pendingDeleteIds.length > 0 && !isDeleting;

  return (
    <>
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
              onClick={openDeleteDialog}
              disabled={isDeleting}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete {selectedCount} draft{selectedCount === 1 ? '' : 's'}
            </button>
          </div>
        ) : null}
      </div>

      {deleteDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-dialog-title"
            aria-describedby="bulk-delete-dialog-description"
            className="w-full max-w-lg overflow-hidden rounded-xl border border-rose-100 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-3 border-b border-rose-100 bg-rose-50 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="bulk-delete-dialog-title" className="text-base font-bold text-slate-950">
                  Delete selected draft applications?
                </h2>
                <p id="bulk-delete-dialog-description" className="mt-1 text-sm leading-5 text-slate-600">
                  This will permanently delete {pendingDeleteIds.length} draft application{pendingDeleteIds.length === 1 ? '' : 's'}, including uploaded R2 files and activity history.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
                This action cannot be undone. Only continue if these filtered draft applications should be removed from the system.
              </div>

              <label className="block text-sm font-semibold text-slate-800">
                Type <span className="font-mono text-rose-700">{expectedConfirmation}</span> to confirm
                <input
                  ref={confirmationInputRef}
                  type="text"
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  disabled={isDeleting}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              {deleteError ? (
                <div className="max-h-28 overflow-auto rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700">
                  {deleteError}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={!canConfirmDelete}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                {isDeleting ? 'Deleting...' : `Delete ${pendingDeleteIds.length} draft${pendingDeleteIds.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
