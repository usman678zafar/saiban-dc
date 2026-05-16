import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  const format = new URL(request.url).searchParams.get('format') || 'csv';
  const applications = await prisma.orphanApplication.findMany({
    orderBy: { createdAt: 'desc' },
  });
  type ApplicationRow = (typeof applications)[number];

  if (format === 'json') {
    return NextResponse.json(applications);
  }

  const headers: Array<keyof ApplicationRow> = [
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

  const csvRows = [headers.join(',')];
  const csvBody = applications
    .map((application: ApplicationRow) =>
      headers
        .map((header: keyof ApplicationRow) => {
          const value = application[header];
          if (typeof value === 'string') return JSON.stringify(value);
          if (typeof value === 'number' || typeof value === 'boolean') return String(value);
          if (value instanceof Date) return JSON.stringify(value.toISOString());
          return '';
        })
        .join(',')
    )
    .join('\n');

  return new Response(csvRows.concat(csvBody ? [csvBody] : []).join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="applications.csv"',
    },
  });
}
