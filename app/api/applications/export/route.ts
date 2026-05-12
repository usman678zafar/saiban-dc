import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get('format') || 'csv';
  const applications = await prisma.orphanApplication.findMany({
    orderBy: { createdAt: 'desc' },
  });

  if (format === 'json') {
    return NextResponse.json(applications);
  }

  const headers = [
    'id',
    'registrationNumber',
    'status',
    'migrationStatus',
    'mainSaibanId',
    'collectorName',
    'collectorProject',
    'childName',
    'gender',
    'city',
    'createdAt',
    'updatedAt',
  ];

  const csvRows = [headers.join(',')];
  const csvBody = applications
    .map((application) =>
      headers
        .map((header) => {
          const value = application[header as keyof typeof application];
          return typeof value === 'string' ? JSON.stringify(value) : value ?? '';
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
