import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

type SystemAuditInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  actorId?: string | null;
  details?: Prisma.InputJsonValue;
};

export async function logSystemAudit({
  action,
  entityType,
  entityId,
  entityLabel,
  actorId,
  details,
}: SystemAuditInput) {
  try {
    const actor = actorId
      ? await prisma.user.findUnique({
        where: { id: actorId },
        select: { role: true },
      })
      : null;

    await prisma.systemAuditLog.create({
      data: {
        action,
        entityType,
        entityId: entityId ?? null,
        entityLabel: entityLabel ?? null,
        actorId: actorId ?? null,
        actorRole: actor?.role ?? null,
        details: details ?? undefined,
      },
    });
  } catch (error) {
    console.error('Unable to write system audit log', error);
  }
}
