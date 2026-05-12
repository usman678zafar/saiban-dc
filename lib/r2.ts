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

export async function uploadToR2(file: File, key: string): Promise<string> {
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: key,
      Body: file,
      ContentType: file.type,
      ACL: 'public-read',
    },
  });

  await upload.done();
  return `https://${process.env.CLOUDFLARE_R2_BUCKET}.r2.cloudflarestorage.com/${key}`;
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
