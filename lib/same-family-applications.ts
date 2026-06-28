import { ApplicationStatus, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const sameFamilyApplicationSelect = {
  id: true,
  registrationNumber: true,
  childName: true,
  age: true,
  status: true,
  updatedAt: true,
  fatherName: true,
  fatherCnic: true,
  motherName: true,
  motherCnic: true,
  motherIsGuardian: true,
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
  age: number | null;
  status: ApplicationStatus;
  updatedAt: Date | string;
  fatherName: string | null;
  fatherCnic: string | null;
  motherName: string | null;
  motherCnic: string | null;
  motherIsGuardian: string | null;
  guardianName: string | null;
  guardianCnic: string | null;
};

export type SameFamilySummary = {
  count: number;
  statuses: Partial<Record<ApplicationStatus, number>>;
};

export type SameFamilyPoolApplication = Prisma.OrphanApplicationGetPayload<{
  select: typeof sameFamilyApplicationSelect;
}>;

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

function familyTokens(application: SameFamilyApplicationSource) {
  const tokens = cnicValues(application).map((value) => `cnic:${value}`);
  const fullAddress = cleanText(application.fullAddress);

  if (fullAddress) {
    for (const value of contactValues(application)) {
      tokens.push(`address-contact:${fullAddress}\u0000${value}`);
    }

    const motherName = cleanText(application.motherName);
    const guardianName = cleanText(application.guardianName);
    const fatherName = cleanText(application.fatherName);
    if (motherName) tokens.push(`address-mother:${fullAddress}\u0000${motherName}`);
    if (guardianName) tokens.push(`address-guardian:${fullAddress}\u0000${guardianName}`);
    if (fatherName) tokens.push(`address-father:${fullAddress}\u0000${fatherName}`);
  }

  return unique(tokens);
}

function buildFamilyTokenIndex<T extends SameFamilyApplicationSource & { status: ApplicationStatus }>(applications: T[]) {
  const tokenIndex = new Map<string, T[]>();
  for (const application of applications) {
    for (const token of familyTokens(application)) {
      const matches = tokenIndex.get(token) ?? [];
      matches.push(application);
      tokenIndex.set(token, matches);
    }
  }
  return tokenIndex;
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
    select: sameFamilyApplicationSelect,
  });
}

export async function loadSameFamilyPool() {
  return prisma.orphanApplication.findMany({
    where: { status: { not: ApplicationStatus.draft } },
    select: sameFamilyApplicationSelect,
  });
}

export function buildSameFamilyData(
  applications: SameFamilyApplicationSource[],
  familyPool: SameFamilyPoolApplication[],
) {
  if (applications.length === 0) {
    return {
      summaries: new Map<string, SameFamilySummary>(),
      relatedApplications: new Map<string, SameFamilyApplicationListItem[]>(),
    };
  }

  const tokenIndex = buildFamilyTokenIndex(familyPool);
  const summaryEntries: Array<readonly [string, SameFamilySummary]> = [];
  const applicationEntries: Array<readonly [string, SameFamilyApplicationListItem[]]> = [];

  for (const application of applications) {
    const related = new Map<string, SameFamilyApplicationListItem>();
    for (const token of familyTokens(application)) {
      for (const match of tokenIndex.get(token) ?? []) {
        if (match.id !== application.id) related.set(match.id, match);
      }
    }

    const statuses: Partial<Record<ApplicationStatus, number>> = {};
    for (const relatedApplication of related.values()) {
      statuses[relatedApplication.status] = (statuses[relatedApplication.status] ?? 0) + 1;
    }

    const sorted = Array.from(related.values()).sort((a, b) => (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
    summaryEntries.push([application.id, { count: related.size, statuses }]);
    applicationEntries.push([application.id, sorted]);
  }

  return {
    summaries: new Map<string, SameFamilySummary>(summaryEntries),
    relatedApplications: new Map<string, SameFamilyApplicationListItem[]>(applicationEntries),
  };
}

export async function getSameFamilyData(applications: SameFamilyApplicationSource[]) {
  return buildSameFamilyData(applications, await loadSameFamilyPool());
}

export async function getSameFamilyApplicationMap(applications: SameFamilyApplicationSource[]) {
  return (await getSameFamilyData(applications)).relatedApplications;
}

export async function getSameFamilySummaries(applications: SameFamilyApplicationSource[]) {
  return (await getSameFamilyData(applications)).summaries;
}
