'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface ApplicationReviewDownloadButtonProps {
  applicationId: string;
  fileName: string;
  label?: string;
  className?: string;
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'application';
}

export default function ApplicationReviewDownloadButton({
  applicationId,
  fileName,
  label,
  className,
}: ApplicationReviewDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadReview = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const response = await fetch(`/api/applications/${applicationId}/review`, {
        credentials: 'same-origin',
      });

      if (!response.ok) {
        let message = 'Unable to download application review.';
        try {
          const result = await response.json() as { message?: string; detail?: string };
          message = result.detail ? `${result.message ?? message} ${result.detail}` : result.message ?? message;
        } catch {
          // Keep the generic message when the server did not return JSON.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `application-review-${safeFileName(fileName)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to download application review.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={downloadReview}
      disabled={isDownloading}
      aria-label={isDownloading ? 'Downloading application review' : 'Download application review'}
      title={isDownloading ? 'Downloading application review' : 'Download application review'}
      className={className}
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="h-4 w-4" aria-hidden="true" />
      )}
      {label ? <span>{isDownloading ? 'Downloading...' : label}</span> : null}
    </button>
  );
}

