import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function getApplicationCollectorPrefill(session: Session | null) {
  if (!session?.user?.id) return {};

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      cnic: true,
      address: true,
      project: true,
      fieldWorkerId: true,
    },
  });

  return {
    collectorId: user?.fieldWorkerId ?? user?.id ?? '',
    collectorName: user?.name ?? '',
    collectorProject: user?.project ?? '',
    collectorCnic: user?.cnic ?? '',
    collectorAddress: user?.address ?? '',
    collectorContact: user?.phoneNumber ?? '',
  };
}

