import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrphanApplicationSchema } from '@/lib/validation';

async function getUser(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

function collectorPayload(user: NonNullable<Awaited<ReturnType<typeof getUser>>>) {
  return {
    collectorId: user.fieldWorkerId ?? user.id,
    collectorName: user.name ?? '',
    collectorProject: user.project ?? '',
    collectorCnic: user.cnic ?? '',
    collectorAddress: user.address ?? '',
    collectorContact: user.phoneNumber ?? '',
  };
}

function clearPayloadFields(payload: any, fields: string[]) {
  for (const field of fields) {
    if (typeof payload[field] === 'boolean') {
      payload[field] = false;
    } else {
      payload[field] = '';
    }
  }
}

function normalizeConditionalPayload(payload: any) {
  const next = { ...payload };

  if (next.motherAlive === 'no') {
    clearPayloadFields(next, ['motherContact', 'motherOccupation', 'motherMonthlyIncome']);
    next.motherIsHousewife = false;
    next.motherRemarried = false;
    next.motherEmploymentStatus = '';
    next.motherIsGuardian = 'no';
  }

  if (next.motherAlive === 'yes') {
    clearPayloadFields(next, ['motherDeathDate', 'motherDeathCause']);
  }

  if (next.motherEmploymentStatus === 'housewife') {
    next.motherIsHousewife = true;
    clearPayloadFields(next, ['motherOccupation', 'motherMonthlyIncome']);
  }

  if (next.motherEmploymentStatus === 'unemployed') {
    next.motherIsHousewife = false;
    clearPayloadFields(next, ['motherOccupation', 'motherMonthlyIncome']);
  }

  if (next.motherEmploymentStatus === 'working') {
    next.motherIsHousewife = false;
  }

  if (next.motherAlive === 'yes' && next.motherIsGuardian === 'yes') {
    clearPayloadFields(next, [
      'guardianName',
      'guardianRelationship',
      'guardianGender',
      'guardianCnic',
      'guardianEducation',
      'guardianMotherTongue',
      'guardianNativeArea',
      'guardianContact',
      'guardianZakatStatus',
      'guardianOccupation',
      'guardianFamilyHolder',
      'guardianFamilyHolderAmount',
      'guardianFamilyMembersCount',
      'guardianMonthlyIncome',
      'guardianSignatureFileKey',
    ]);
  }

  if (!next.guardianGender) {
    clearPayloadFields(next, ['guardianOccupation']);
  }

  next.guardianZakatStatus = '';

  if (next.guardianFamilyHolder !== 'yes') {
    clearPayloadFields(next, ['guardianFamilyHolderAmount', 'guardianFamilyMembersCount']);
  }

  next.guardianFamilyHolderAmount = '';

  if (next.houseOwnershipStatus === 'rented') {
    next.houseOwnershipStatus = 'rent';
  }

  if (next.houseOwnershipStatus !== 'rent') {
    clearPayloadFields(next, ['monthlyRent', 'rentPaidBy', 'houseOwner']);
  }

  if (next.healthStatus === 'healthy') {
    clearPayloadFields(next, ['disabilityDetails', 'treatmentPlace', 'monthlyMedicalExpenses']);
  }

  if (next.healthStatus === 'sick') {
    clearPayloadFields(next, ['disabilityDetails']);
  }

  if (next.healthStatus === 'disabled') {
    clearPayloadFields(next, ['treatmentPlace']);
  }

  if (next.currentlyStudying === false || next.currentlyStudying === 'false') {
    clearPayloadFields(next, ['currentClass', 'schoolName', 'schoolAddress', 'educationFeeStatus', 'monthlySchoolFee']);
  }

  if (next.currentlyStudying === true || next.currentlyStudying === 'true') {
    clearPayloadFields(next, ['notStudyingReason', 'educationStartCondition']);
  }

  if (next.educationFeeStatus !== 'paid') {
    clearPayloadFields(next, ['monthlySchoolFee']);
  }

  if (next.enrolledInMadrasa === false || next.enrolledInMadrasa === 'false') {
    clearPayloadFields(next, ['madrasaName', 'madrasaEducationDetails']);
  }

  if (next.receivingOtherAid === false || next.receivingOtherAid === 'false') {
    clearPayloadFields(next, ['otherAidSource', 'monthlyAidAmount']);
  }

  return next;
}

function buildRegistrationNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}`.padStart(9, '0');
  return `APP-${datePart}-${timePart}`;
}

async function generateRegistrationNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const registrationNumber = buildRegistrationNumber();
    const existing = await prisma.orphanApplication.findUnique({
      where: { registrationNumber },
      select: { id: true },
    });

    if (!existing) return registrationNumber;
  }

  throw new Error('Unable to generate registration number');
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const normalizedBody = normalizeConditionalPayload(body);
    const validated = getOrphanApplicationSchema.parse(normalizedBody) as any;
    const { siblings, relatives, householdAssets, ...payload } = validated;

    const status = payload.status ?? 'draft';
    const application = await prisma.orphanApplication.create({
      data: {
        ...payload,
        registrationNumber: status === 'submitted' ? await generateRegistrationNumber() : undefined,
        ...collectorPayload(user),
        createdById: user.id,
        status,
        siblings: {
          create: siblings ?? [],
        },
        relatives: {
          create: relatives ?? [],
        },
        householdAssets: {
          create: householdAssets ?? [],
        },
      },
    });

    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Validation failed' },
      { status: 422 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, siblings, relatives, householdAssets, ...payload } = body;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ message: 'Missing application id' }, { status: 400 });
  }

  try {
    const normalizedBody = normalizeConditionalPayload(body);
    const validated = getOrphanApplicationSchema.parse(normalizedBody) as any;
    const application = await prisma.orphanApplication.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    if (application.createdById !== user.id && user.role !== 'admin') {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    const updateData: any = {
      ...validated,
      updatedById: user.id,
      status: validated.status ?? application.status,
    };

    const shouldGenerateRegistrationNumber = application.status !== 'submitted' && updateData.status === 'submitted' && !application.registrationNumber;
    delete updateData.registrationNumber;
    if (shouldGenerateRegistrationNumber) {
      updateData.registrationNumber = await generateRegistrationNumber();
    }

    delete updateData.collectorId;
    delete updateData.collectorName;
    delete updateData.collectorProject;
    delete updateData.collectorCnic;
    delete updateData.collectorAddress;
    delete updateData.collectorContact;

    if (body.siblings !== undefined) {
      updateData.siblings = {
        deleteMany: {},
        create: validated.siblings ?? [],
      };
    }

    if (body.relatives !== undefined) {
      updateData.relatives = {
        deleteMany: {},
        create: validated.relatives ?? [],
      };
    }

    if (body.householdAssets !== undefined) {
      updateData.householdAssets = {
        deleteMany: {},
        create: validated.householdAssets ?? [],
      };
    }

    const updated = await prisma.orphanApplication.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Validation failed' },
      { status: 422 },
    );
  }
}
