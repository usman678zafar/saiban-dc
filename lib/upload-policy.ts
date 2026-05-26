import { DocumentType } from '@prisma/client';

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

const allowedDocumentTypes = new Set(Object.values(DocumentType));

export function isAllowedDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && allowedDocumentTypes.has(value as DocumentType);
}

export function uploadTypeLabel() {
  return 'JPG, PNG, WebP, or PDF';
}

export async function detectAllowedFileType(file: File) {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as any)) return false;

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
  const isWebp = (
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  );

  if (file.type === 'image/jpeg') return isJpeg;
  if (file.type === 'image/png') return isPng;
  if (file.type === 'image/webp') return isWebp;
  if (file.type === 'application/pdf') return isPdf;

  return false;
}
