import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(file: File | Blob | ArrayBuffer | Uint8Array, key: string, contentType: string): Promise<string> {
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: key,
      Body: file as any,
      ContentType: contentType,
      ACL: 'public-read',
    },
  });

  await upload.done();
  return getPublicR2Url(key);
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: key,
    }),
  );
}

export function generateFileKey(documentType: string, applicationId: string, originalName: string): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `${documentType}/${applicationId}/${timestamp}.${extension}`;
}

export function getPublicR2Url(key: string) {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, '');
  if (publicUrl) return `${publicUrl}/${key.replace(/^\/+/, '')}`;

  return `https://${process.env.CLOUDFLARE_R2_BUCKET}.r2.cloudflarestorage.com/${key}`;
}

export function normalizeR2FileUrl(fileUrl: string | null | undefined, fileKey: string | null | undefined) {
  if (!fileKey) return fileUrl ?? null;

  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, '');
  if (!publicUrl) return fileUrl ?? null;

  return getPublicR2Url(fileKey);
}
