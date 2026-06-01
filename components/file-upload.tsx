'use client';

import { useRef, useState, type ReactNode } from 'react';
import { ExternalLink, Upload, X } from 'lucide-react';

const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_COMPRESSION_QUALITY = 0.82;

interface FileUploadProps {
  documentType: string;
  applicationId?: string | null;
  ensureApplicationId?: () => Promise<string | null>;
  onUpload: (document: any) => void;
  onRemove?: (documentId: string) => void;
  existingDocument?: any;
  label: ReactNode;
  accept?: string;
  disabled?: boolean;
}

export default function FileUpload({
  documentType,
  applicationId,
  ensureApplicationId,
  onUpload,
  onRemove,
  existingDocument,
  label,
  accept = 'image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf',
  disabled = false,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prepareFileForUpload = async (file: File) => {
    if (!file.type.startsWith('image/') || file.type === 'image/webp' && file.size <= MAX_UPLOAD_SIZE) return file;

    const imageUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Unable to prepare this image for upload.'));
        img.src = imageUrl;
      });

      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return file;

      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', IMAGE_COMPRESSION_QUALITY);
      });

      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || disabled) return;

    setIsUploading(true);
    setError(null);

    try {
      const file = await prepareFileForUpload(selectedFile);
      if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error('File too large. Maximum upload size is 4MB. Please choose a smaller file or scan/photo at lower quality.');
      }

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
      const message = error instanceof Error ? error.message : 'Upload failed';
      setError(message === 'Failed to fetch'
        ? 'Upload could not reach the server. Please check your connection and use a file under 4MB.'
        : message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (existingDocument && onRemove && !disabled) {
      try {
        await onRemove(existingDocument.id);
      } catch {
        setError('Failed to remove document');
      }
    }
  };

  return (
    <div className="min-w-0 space-y-2">
      <label className="block min-w-0 break-words text-sm font-medium leading-6 text-slate-700">{label}</label>

      {existingDocument ? (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <a
            href={existingDocument.fileUrl ?? '#'}
            target={existingDocument.fileUrl ? '_blank' : undefined}
            rel={existingDocument.fileUrl ? 'noreferrer' : undefined}
            aria-disabled={!existingDocument.fileUrl}
            className={`min-w-0 flex-1 rounded-md outline-none focus:ring-2 focus:ring-blue-200 ${existingDocument.fileUrl ? 'hover:text-blue-700' : 'pointer-events-none'}`}
          >
            <p className="break-words text-sm font-medium text-slate-900">{existingDocument.documentType}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 break-words text-xs leading-5 text-slate-500">
              <span>{(existingDocument.size / 1024).toFixed(1)} KB • {existingDocument.mimeType}</span>
              {existingDocument.fileUrl ? <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </p>
          </a>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:hidden"
            aria-label="Remove uploaded file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : disabled ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No document uploaded.
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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

