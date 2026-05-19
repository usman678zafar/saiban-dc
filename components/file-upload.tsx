'use client';

import { useState, useRef, type ReactNode } from 'react';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  documentType: string;
  applicationId?: string | null;
  ensureApplicationId?: () => Promise<string | null>;
  onUpload: (document: any) => void;
  onRemove?: (documentId: string) => void;
  existingDocument?: any;
  label: ReactNode;
  accept?: string;
}

export default function FileUpload({
  documentType,
  applicationId,
  ensureApplicationId,
  onUpload,
  onRemove,
  existingDocument,
  label,
  accept = 'image/*,.pdf',
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploadApplicationId = applicationId ?? await ensureApplicationId?.();
      if (!uploadApplicationId) {
        throw new Error('Save a draft before uploading this file.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('applicationId', uploadApplicationId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const document = await response.json();
      onUpload(document);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (existingDocument && onRemove) {
      try {
        await onRemove(existingDocument.id);
      } catch (error) {
        setError('Failed to remove document');
      }
    }
  };

  return (
    <div className="min-w-0 space-y-2">
      <label className="block min-w-0 break-words text-sm font-medium leading-6 text-slate-700">{label}</label>

      {existingDocument ? (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium text-slate-900">{existingDocument.documentType}</p>
            <p className="mt-0.5 break-words text-xs leading-5 text-slate-500">
              {(existingDocument.size / 1024).toFixed(1)} KB • {existingDocument.mimeType}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            aria-label="Remove uploaded file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:flex-row sm:gap-3 sm:py-8"
          >
            <Upload className="h-5 w-5" />
            {isUploading ? 'Uploading...' : 'Choose file'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
