import type { Prisma } from '@prisma/client';
import { cnicVariants } from '@/lib/contact-format';

function containsInsensitive(query: string) {
  return { contains: query, mode: 'insensitive' as const };
}

export function applicationSearchWhere(search: string): Prisma.OrphanApplicationWhereInput {
  const query = search.trim();
  if (!query) return {};
  const cnicSearchTerms = Array.from(new Set([query, ...cnicVariants(query)]));
  const cnicFilters = cnicSearchTerms.flatMap((term): Prisma.OrphanApplicationWhereInput[] => [
    { fatherCnic: containsInsensitive(term) },
    { motherCnic: containsInsensitive(term) },
    { guardianCnic: containsInsensitive(term) },
  ]);

  return {
    OR: [
      { id: containsInsensitive(query) },
      { registrationNumber: containsInsensitive(query) },
      { childName: containsInsensitive(query) },
      { bFormNumber: containsInsensitive(query) },
      { fatherName: containsInsensitive(query) },
      { motherName: containsInsensitive(query) },
      { guardianName: containsInsensitive(query) },
      ...cnicFilters,
      { collectorName: containsInsensitive(query) },
      { collectorProject: containsInsensitive(query) },
    ],
  };
}

