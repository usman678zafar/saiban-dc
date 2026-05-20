'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface DeleteDraftApplicationButtonProps {
  applicationId: string;
  className?: string;
}

export default function DeleteDraftApplicationButton({ applicationId, className }: DeleteDraftApplicationButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/applications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: applicationId }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message ?? 'Unable to delete draft application.');
      }

      setShowModal(false);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to delete draft application.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={isDeleting}
        aria-label="Delete draft"
        title="Delete draft"
        className={className ?? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60'}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete Application</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this draft application? This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="inline-flex w-full items-center justify-center rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex w-full items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

