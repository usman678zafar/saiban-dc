import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toIsoString } from '@/lib/safe-date';

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return '';
  const stringValue = value instanceof Date ? toIsoString(value) : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  const format = new URL(request.url).searchParams.get('format') || 'csv';
  const applications = await prisma.orphanApplication.findMany({
    where: session.user.role === 'super_admin' ? {} : { status: { not: 'draft' } },
    orderBy: { createdAt: 'desc' },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
    },
  });

  if (format === 'json') {
    return NextResponse.json(applications);
  }

  type ApplicationRow = (typeof applications)[number];

  const scalarHeaders: Array<keyof ApplicationRow> = [
    'id',
    'registrationNumber',
    'collectorId',
    'status',
    'migrationStatus',
    'mainSaibanId',
    'collectorName',
    'collectorProject',
    'childName',
    'gender',
    'province',
    'district',
    'tehsil',
    'city',
    'residentialArea',
    'fullAddress',
    'latitude',
    'longitude',
    'gpsAccuracyMeters',
    'gpsCapturedAt',
    'houseOwnershipStatus',
    'residenceStructureType',
    'residenceCategory',
    'houseCondition',
    'houseConditionRemarks',
    'electricityAvailable',
    'gasAvailable',
    'waterAvailable',
    'createdAt',
    'updatedAt',
  ];

  const nestedHeaders = ['siblings', 'relatives', 'householdAssets'] as const;
  const allHeaders = [...scalarHeaders, ...nestedHeaders];

  const csvRows = [allHeaders.map(csvEscape).join(',')];
  const csvBody = applications
    .map((application: ApplicationRow) => {
      const scalarValues = scalarHeaders.map((header) => {
        const value = application[header];
        return csvEscape(value);
      });
      const nestedValues = nestedHeaders.map((header) =>
        csvEscape(JSON.stringify(application[header]))
      );
      return [...scalarValues, ...nestedValues].join(',');
    })
    .join('\n');

  return new Response(`\uFEFF${csvRows.concat(csvBody ? [csvBody] : []).join('\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="applications.csv"',
    },
  });
}

