'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface DeleteDraftApplicationButtonProps {
  applicationId: string;
  compact?: boolean;
}

export default function DeleteDraftApplicationButton({ applicationId, compact = false }: DeleteDraftApplicationButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft application? This action cannot be undone.')) return;

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

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to delete draft application.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className={
        compact
          ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60'
          : 'inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60'
      }
    >
      <Trash2 className="h-4 w-4" />
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}
