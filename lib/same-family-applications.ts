import { ApplicationStatus, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const sameFamilyApplicationSelect = {
  id: true,
  registrationNumber: true,
  childName: true,
  status: true,
  updatedAt: true,
  fatherName: true,
  fatherCnic: true,
  motherName: true,
  motherCnic: true,
  motherContact: true,
  guardianName: true,
  guardianCnic: true,
  guardianContact: true,
  fullAddress: true,
} satisfies Prisma.OrphanApplicationSelect;

export type SameFamilyApplicationSource = {
  id: string;
  fatherName: string | null;
  fatherCnic: string | null;
  motherName: string | null;
  motherCnic: string | null;
  motherContact: string | null;
  guardianName: string | null;
  guardianCnic: string | null;
  guardianContact: string | null;
  fullAddress: string | null;
};

export type SameFamilyApplicationListItem = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: ApplicationStatus;
  updatedAt: Date;
};

export type SameFamilySummary = {
  count: number;
  statuses: Partial<Record<ApplicationStatus, number>>;
};

type SameFamilyStringField =
  | 'fatherName'
  | 'fatherCnic'
  | 'motherName'
  | 'motherCnic'
  | 'motherContact'
  | 'guardianName'
  | 'guardianCnic'
  | 'guardianContact'
  | 'fullAddress';

function cleanText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') || '';
}

function digitsOnly(value: string | null | undefined) {
  return value?.replace(/\D/g, '') || '';
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function cnicValues(application: SameFamilyApplicationSource) {
  return unique([
    digitsOnly(application.fatherCnic),
    digitsOnly(application.motherCnic),
    digitsOnly(application.guardianCnic),
  ].filter((value) => value.length === 13));
}

function contactValues(application: SameFamilyApplicationSource) {
  return unique([
    digitsOnly(application.motherContact),
    digitsOnly(application.guardianContact),
  ].filter((value) => value.length >= 10));
}

function exactValue(field: SameFamilyStringField, value: string): Prisma.OrphanApplicationWhereInput {
  return {
    [field]: { equals: value, mode: 'insensitive' },
  } as Prisma.OrphanApplicationWhereInput;
}

export function sameFamilyWhere(application: SameFamilyApplicationSource): Prisma.OrphanApplicationWhereInput | null {
  const cnics = cnicValues(application);
  const contacts = contactValues(application);
  const fullAddress = cleanText(application.fullAddress);
  const motherName = cleanText(application.motherName);
  const guardianName = cleanText(application.guardianName);
  const fatherName = cleanText(application.fatherName);
  const or: Prisma.OrphanApplicationWhereInput[] = [];

  for (const value of cnics) {
    or.push(exactValue('fatherCnic', value));
    or.push(exactValue('motherCnic', value));
    or.push(exactValue('guardianCnic', value));
  }

  if (fullAddress && contacts.length) {
    for (const value of contacts) {
      or.push({ AND: [{ fullAddress }, { OR: [exactValue('motherContact', value), exactValue('guardianContact', value)] }] });
    }
  }

  if (fullAddress && (motherName || guardianName || fatherName)) {
    or.push({
      AND: [
        { fullAddress },
        {
          OR: [
            ...(motherName ? [{ motherName }] : []),
            ...(guardianName ? [{ guardianName }] : []),
            ...(fatherName ? [{ fatherName }] : []),
          ],
        },
      ],
    });
  }

  if (or.length === 0) return null;

  return {
    id: { not: application.id },
    status: { not: ApplicationStatus.draft },
    OR: or,
  };
}

export async function getSameFamilyApplications(application: SameFamilyApplicationSource) {
  const where = sameFamilyWhere(application);
  if (!where) return [];

  return prisma.orphanApplication.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      registrationNumber: true,
      childName: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function getSameFamilySummaries(applications: SameFamilyApplicationSource[]) {
  const entries = await Promise.all(applications.map(async (application) => {
    const where = sameFamilyWhere(application);
    if (!where) return [application.id, { count: 0, statuses: {} }] as const;

    const grouped = await prisma.orphanApplication.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    const statuses = grouped.reduce<Partial<Record<ApplicationStatus, number>>>((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {});

    return [application.id, {
      count: grouped.reduce((total, item) => total + item._count._all, 0),
      statuses,
    }] as const;
  }));

  return new Map<string, SameFamilySummary>(entries);
}
