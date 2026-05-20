import type { Prisma } from '@prisma/client';

export function applicationSearchWhere(search: string): Prisma.OrphanApplicationWhereInput {
  const query = search.trim();
  if (!query) return {};

  return {
    OR: [
      { id: { contains: query, mode: 'insensitive' as const } },
      { registrationNumber: { contains: query, mode: 'insensitive' as const } },
      { childName: { contains: query, mode: 'insensitive' as const } },
      { bFormNumber: { contains: query, mode: 'insensitive' as const } },
      { fatherName: { contains: query, mode: 'insensitive' as const } },
      { fatherCnic: { contains: query, mode: 'insensitive' as const } },
      { motherName: { contains: query, mode: 'insensitive' as const } },
      { motherCnic: { contains: query, mode: 'insensitive' as const } },
      { guardianName: { contains: query, mode: 'insensitive' as const } },
      { guardianCnic: { contains: query, mode: 'insensitive' as const } },
      { collectorName: { contains: query, mode: 'insensitive' as const } },
      { collectorProject: { contains: query, mode: 'insensitive' as const } },
    ],
  };
}

