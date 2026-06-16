import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toIsoString } from '@/lib/safe-date';
import { calculateApplicationCompletion } from '@/lib/application-review';
import { applicationToWizardData } from '@/lib/application-wizard-data';

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
    where: {},
    orderBy: { createdAt: 'desc' },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
      documents: {
        select: {
          documentType: true,
        },
      },
      createdBy: {
        select: {
          phoneNumber: true,
          cnic: true,
        },
      },
    },
  });

  if (format === 'json') {
    return NextResponse.json(applications.map((application) => {
      const { documents, ...applicationExport } = application;
      return {
        ...applicationExport,
        createdByPhoneNumber: application.createdBy.phoneNumber,
        createdByCnic: application.createdBy.cnic,
        completionPercentage: calculateApplicationCompletion(applicationToWizardData(application), documents).percentage,
      };
    }));
  }

  type ApplicationRow = (typeof applications)[number];
  type ComputedHeader = 'createdByPhoneNumber' | 'createdByCnic';

  const scalarHeaders: Array<keyof ApplicationRow> = [
    'id',
    'registrationNumber',
    'collectorId',
    'collectorContact',
    'collectorCnic',
    'collectorAddress',
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

  const completionHeader = '% complete';
  const computedHeaders: ComputedHeader[] = ['createdByPhoneNumber', 'createdByCnic'];
  const nestedHeaders = ['siblings', 'relatives', 'householdAssets'] as const;
  const allHeaders = [
    ...scalarHeaders.slice(0, 2),
    completionHeader,
    ...scalarHeaders.slice(2),
    ...computedHeaders,
    ...nestedHeaders,
  ];

  const csvRows = [allHeaders.map(csvEscape).join(',')];
  const csvBody = applications
    .map((application: ApplicationRow) => {
      const completionPercentage = calculateApplicationCompletion(applicationToWizardData(application), application.documents).percentage;
      const scalarValues = scalarHeaders.map((header) => {
        const value = application[header];
        return csvEscape(value);
      });
      const computedValues = computedHeaders.map((header) => {
        const value = header === 'createdByPhoneNumber'
          ? application.createdBy.phoneNumber
          : application.createdBy.cnic;
        return csvEscape(value);
      });
      const nestedValues = nestedHeaders.map((header) =>
        csvEscape(JSON.stringify(application[header]))
      );
      return [
        ...scalarValues.slice(0, 2),
        csvEscape(completionPercentage),
        ...scalarValues.slice(2),
        ...computedValues,
        ...nestedValues,
      ].join(',');
    })
    .join('\n');

  return new Response(`\uFEFF${csvRows.concat(csvBody ? [csvBody] : []).join('\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="applications.csv"',
    },
  });
}

