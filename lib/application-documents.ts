import { prisma } from '@/lib/prisma';
import { normalizeR2FileUrl } from '@/lib/r2';

export type ApplicationDocumentView = {
  id: string;
  applicationId: string;
  fileKey: string;
  fileUrl: string | null;
  mimeType: string;
  size: number;
  documentType: string;
  createdAt: Date;
};

export async function getApplicationDocuments(applicationId: string) {
  const documents = await prisma.$queryRaw<ApplicationDocumentView[]>`
    SELECT
      "id",
      "applicationId",
      "fileKey",
      "fileUrl",
      "mimeType",
      "size",
      "documentType"::text AS "documentType",
      "createdAt"
    FROM "ApplicationDocument"
    WHERE "applicationId" = ${applicationId}
    ORDER BY "createdAt" ASC
  `;

  return documents.map((document) => ({
    ...document,
    fileUrl: normalizeR2FileUrl(document.fileUrl, document.fileKey),
  }));
}
