import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { deleteFromR2 } from '@/lib/r2';

export const applicationDeletionSelect = {
  id: true,
  status: true,
  createdById: true,
  registrationNumber: true,
  childName: true,
  collectorName: true,
  collectorProject: true,
  principalSignatureFileKey: true,
  institutionStampFileKey: true,
  imamSignatureFileKey: true,
  mosqueStampFileKey: true,
  guardianSignatureFileKey: true,
  documents: {
    select: {
      fileKey: true,
    },
  },
} as const;

export type ApplicationDeletionRecord = Prisma.OrphanApplicationGetPayload<{
  select: typeof applicationDeletionSelect;
}>;

const directFileKeyFields = [
  'principalSignatureFileKey',
  'institutionStampFileKey',
  'imamSignatureFileKey',
  'mosqueStampFileKey',
  'guardianSignatureFileKey',
] as const;

export function applicationR2FileKeys(application: ApplicationDeletionRecord) {
  const fileKeys = new Set<string>();

  for (const document of application.documents) {
    if (document.fileKey.trim()) fileKeys.add(document.fileKey);
  }

  for (const field of directFileKeyFields) {
    const value = application[field];
    if (typeof value === 'string' && value.trim()) fileKeys.add(value);
  }

  return [...fileKeys];
}

export async function deleteApplicationRecords(applications: ApplicationDeletionRecord[]) {
  let deletedFileCount = 0;

  for (const application of applications) {
    const fileKeys = applicationR2FileKeys(application);

    await Promise.all(fileKeys.map((fileKey) => deleteFromR2(fileKey)));
    deletedFileCount += fileKeys.length;

    await prisma.$transaction([
      prisma.applicationDocument.deleteMany({ where: { applicationId: application.id } }),
      prisma.sibling.deleteMany({ where: { applicationId: application.id } }),
      prisma.relative.deleteMany({ where: { applicationId: application.id } }),
      prisma.householdAsset.deleteMany({ where: { applicationId: application.id } }),
      prisma.auditLog.deleteMany({ where: { applicationId: application.id } }),
      prisma.orphanApplication.delete({ where: { id: application.id } }),
    ]);
  }

  return {
    deletedApplicationCount: applications.length,
    deletedFileCount,
  };
}
