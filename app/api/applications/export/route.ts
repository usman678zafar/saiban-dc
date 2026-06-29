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
  if (!['admin', 'super_admin', 'viewer'].includes(session.user.role ?? '')) {
    return NextResponse.json({ message: 'Access denied' }, { status: 403 });
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
          name: true,
          email: true,
          role: true,
          phoneNumber: true,
          cnic: true,
          supervisor: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  function supervisorNameForExport(application: (typeof applications)[number]) {
    if (application.createdBy.role === 'supervisor') {
      return application.createdBy.name ?? application.createdBy.email;
    }

    return application.createdBy.supervisor?.name
      ?? application.createdBy.supervisor?.email
      ?? null;
  }

  if (format === 'json') {
    return NextResponse.json(applications.map((application) => {
      const {
        documents,
        createdBy,
        filledFieldsPercentage,
        filledFieldsCount,
        totalMeaningfulFields,
        ...applicationExport
      } = application;
      return {
        ...applicationExport,
        fatherName: application.fatherName,
        supervisorName: supervisorNameForExport(application),
        createdByPhoneNumber: createdBy.phoneNumber,
        createdByCnic: createdBy.cnic,
        completionPercentage: filledFieldsPercentage,
        completionCompleteItems: filledFieldsCount,
        completionTotalItems: totalMeaningfulFields,
      };
    }));
  }

  type ApplicationRow = (typeof applications)[number];
  type ComputedHeader =
    | 'supervisorName'
    | 'createdByPhoneNumber'
    | 'createdByCnic'
    | 'completionPercentage'
    | 'completionCompleteItems'
    | 'completionTotalItems';

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
    'fatherName',
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

  const computedHeaders: ComputedHeader[] = [
    'supervisorName',
    'completionPercentage',
    'completionCompleteItems',
    'completionTotalItems',
    'createdByPhoneNumber',
    'createdByCnic',
  ];
  const nestedHeaders = ['siblings', 'relatives', 'householdAssets'] as const;
  const allHeaders = [
    ...scalarHeaders,
    ...computedHeaders,
    ...nestedHeaders,
  ];

  const csvRows = [allHeaders.map(csvEscape).join(',')];
  const csvBody = applications
    .map((application: ApplicationRow) => {
      const scalarValues = scalarHeaders.map((header) => {
        const value = application[header];
        return csvEscape(value);
      });
      const computedValues = computedHeaders.map((header) => {
        const value =
          header === 'supervisorName'
            ? supervisorNameForExport(application)
            : header === 'createdByPhoneNumber'
            ? application.createdBy.phoneNumber
            : header === 'createdByCnic'
              ? application.createdBy.cnic
              : header === 'completionPercentage'
                ? application.filledFieldsPercentage
                : header === 'completionCompleteItems'
                  ? application.filledFieldsCount
                  : application.totalMeaningfulFields;
        return csvEscape(value);
      });
      const nestedValues = nestedHeaders.map((header) =>
        csvEscape(JSON.stringify(application[header]))
      );
      return [
        ...scalarValues,
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

