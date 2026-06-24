import { ApplicationStatus, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logSystemAudit } from '@/lib/system-audit';
import {
  APPLICATION_COMPLETION_DEADLINE_DAYS,
  APPLICATION_DELETION_COMPLETION_THRESHOLD,
} from '@/lib/application-deadline';
import { applicationDeletionSelect, deleteApplicationRecords } from '@/lib/application-deletion';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function expiredIncompleteApplicationsWhere(now = new Date()): Prisma.OrphanApplicationWhereInput {
  return {
    status: ApplicationStatus.draft,
    filledFieldsPercentage: {
      lte: APPLICATION_DELETION_COMPLETION_THRESHOLD,
    },
    createdAt: {
      lte: new Date(now.getTime() - APPLICATION_COMPLETION_DEADLINE_DAYS * MS_PER_DAY),
    },
  };
}

export async function deleteExpiredIncompleteApplications({
  actorId = null,
  limit = 250,
  batchSize = 25,
  now = new Date(),
}: {
  actorId?: string | null;
  limit?: number;
  batchSize?: number;
  now?: Date;
} = {}) {
  const where = expiredIncompleteApplicationsWhere(now);
  let deletedCount = 0;
  let deletedFileCount = 0;

  while (deletedCount < limit) {
    const take = Math.min(batchSize, limit - deletedCount);
    const applications = await prisma.orphanApplication.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take,
      select: applicationDeletionSelect,
    });

    if (applications.length === 0) break;

    const result = await deleteApplicationRecords(applications);
    deletedCount += result.deletedApplicationCount;
    deletedFileCount += result.deletedFileCount;
  }

  if (deletedCount > 0) {
    await logSystemAudit({
      action: 'expired_incomplete_applications_deleted',
      entityType: 'application',
      entityId: 'expired-incomplete-cleanup',
      entityLabel: `${deletedCount} expired incomplete applications`,
      actorId,
      details: {
        deletedCount,
        deletedFileCount,
        completionThreshold: APPLICATION_DELETION_COMPLETION_THRESHOLD,
        deadlineDays: APPLICATION_COMPLETION_DEADLINE_DAYS,
        status: ApplicationStatus.draft,
        limit,
      },
    });
  }

  return {
    deletedCount,
    deletedFileCount,
  };
}
