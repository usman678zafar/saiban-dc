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
      aria-label="Delete draft"
      title={isDeleting ? 'Deleting draft' : 'Delete draft'}
      className={className ?? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60'}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
