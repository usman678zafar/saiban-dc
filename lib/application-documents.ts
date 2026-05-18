import { prisma } from '@/lib/prisma';

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

export function getApplicationDocuments(applicationId: string) {
  return prisma.$queryRaw<ApplicationDocumentView[]>`
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
}
