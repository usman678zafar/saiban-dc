import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ZodError } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrphanApplicationSchema } from '@/lib/validation';
import { isValidDistrictForProvince, isValidTehsilForDistrict } from '@/lib/address-utils';
import { deleteFromR2 } from '@/lib/r2';

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

function validationErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join('.') || 'form'}: ${issue.message}`)
      .join('\n');
  }

  return error instanceof Error ? error.message : 'Validation failed';
}

const draftStringFields = [
  'registrationNumber', 'collectorId', 'collectorName', 'collectorProject', 'collectorAddress', 'collectorContact',
  'fatherName', 'fatherCnic', 'fatherEducation', 'fatherTongue', 'fatherNativeArea', 'fatherOccupation', 'fatherCauseOfDeath',
  'motherName', 'motherCnic', 'motherEducation', 'motherTongue', 'motherNativeArea', 'motherAlive', 'motherSeparationReason',
  'motherEmploymentStatus', 'motherIsGuardian', 'motherContact', 'motherOccupation', 'motherDeathCause',
  'guardianName', 'guardianRelationship', 'guardianGender', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue',
  'guardianNativeArea', 'guardianContact', 'guardianZakatStatus', 'guardianOccupation', 'guardianFamilyHolder',
  'paternalGrandfatherName', 'paternalGrandfatherOccupation', 'maternalGrandfatherName', 'maternalGrandfatherOccupation',
  'province', 'city', 'district', 'tehsil', 'residentialArea', 'fullAddress', 'rentPaidBy', 'houseOwner', 'houseCondition',
  'residenceStructureType', 'residenceCategory', 'houseConditionRemarks', 'furnishingCondition', 'furnishingConditionRemarks',
  'childName', 'gender', 'caste', 'sect', 'religion', 'specifyReligion', 'syedStatus', 'nationality', 'specifyNationality',
  'bFormNumber', 'livingSituationNotes', 'healthStatus', 'disabilityDetails', 'disabilityType', 'disabilityCause',
  'disabilityCauseDetails', 'disabilitySince', 'treatmentOngoing', 'chronicDisease', 'specifyDisease', 'treatmentPlace',
  'notStudyingReason', 'educationStartCondition', 'currentClass', 'schoolName', 'schoolAddress', 'madrasaName',
  'madrasaEducationDetails', 'educationFeeStatus', 'schoolTransportMode', 'educationFree', 'currentSkillLearning',
  'currentSkill', 'technicalSkillInterest', 'technicalSkill', 'householdHasMonthlyIncome', 'childEarnsIncome',
  'childWorkNature', 'assistanceApplied', 'assistanceAppliedWhere', 'careerGoal', 'technicalInterest', 'learningSkill',
  'otherAidSource', 'notAppliedElsewhereReason', 'guardianSignatureFileKey', 'mainSaibanId', 'migrationErrors',
] as const;

const draftIntFields = [
  'fatherAge', 'motherAge', 'guardianFamilyMembersCount', 'paternalGrandfatherAge', 'maternalGrandfatherAge',
  'age', 'totalSiblings', 'totalBrothers', 'totalSisters', 'registeredBrothers', 'registeredSisters',
  'siblingsUnder12', 'totalFamilyMembers', 'householdEarnersCount',
] as const;

const draftFloatFields = [
  'motherMonthlyIncome', 'guardianFamilyHolderAmount', 'guardianMonthlyIncome', 'paternalGrandfatherIncome',
  'maternalGrandfatherIncome', 'longitude', 'latitude', 'gpsAccuracyMeters', 'monthlyRent', 'monthlyMedicalExpenses',
  'monthlySchoolFee', 'schoolDistanceKm', 'childMonthlyIncome', 'totalHouseholdIncome', 'monthlyAidAmount',
] as const;

const draftBooleanFields = [
  'motherIsHousewife', 'motherRemarried', 'relativeInformationDisclosed', 'electricityAvailable', 'gasAvailable',
  'waterAvailable', 'childLivesWithMother', 'currentlyStudying', 'enrolledInMadrasa', 'educationUndertakingAccepted',
  'receivingOtherAid', 'termsAccepted',
] as const;

const draftDateFields = [
  'fatherDob', 'fatherDateOfDeath', 'motherDob', 'motherDeathDate', 'gpsCapturedAt', 'dateOfBirth',
  'illnessSince', 'schoolStudyingSince', 'termsAcceptedAt',
] as const;

const applicationStatuses = ['draft', 'submitted', 'needs_correction', 'validated', 'rejected', 'migrated'];
const migrationStatuses = ['pending', 'validated', 'migrated', 'rejected'];
const relativeTypes = ['paternal_grandfather', 'maternal_grandfather', 'paternal_uncle', 'maternal_uncle'];

function cleanString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function cleanNumber(value: unknown, integer = false) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return integer ? Math.trunc(parsed) : parsed;
}

function cleanBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
    if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  }
  return undefined;
}

function cleanDate(value: unknown) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function sanitizeDraftApplication(input: any) {
  const draft: any = {};

  for (const field of draftStringFields) {
    const value = cleanString(input[field]);
    if (value !== undefined) draft[field] = value;
  }

  for (const field of draftIntFields) {
    const value = cleanNumber(input[field], true);
    if (value !== undefined) draft[field] = value;
  }

  for (const field of draftFloatFields) {
    const value = cleanNumber(input[field]);
    if (value !== undefined) draft[field] = value;
  }

  for (const field of draftBooleanFields) {
    const value = cleanBoolean(input[field]);
    if (value !== undefined) draft[field] = value;
  }

  for (const field of draftDateFields) {
    const value = cleanDate(input[field]);
    if (value !== undefined) draft[field] = value;
  }

  draft.status = applicationStatuses.includes(input.status) ? input.status : 'draft';
  if (draft.status !== 'submitted') draft.status = 'draft';
  if (migrationStatuses.includes(input.migrationStatus)) draft.migrationStatus = input.migrationStatus;
  if (Array.isArray(input.childHobbies)) draft.childHobbies = input.childHobbies.filter((value: unknown) => typeof value === 'string' && value.trim()).join(',');

  draft.siblings = Array.isArray(input.siblings)
    ? input.siblings.map((sibling: any) => ({
      name: cleanString(sibling.name),
      relation: cleanString(sibling.relation),
      dob: cleanDate(sibling.dob),
      age: cleanNumber(sibling.age, true),
      educationStatus: cleanString(sibling.educationStatus),
      currentlyStudying: cleanBoolean(sibling.currentlyStudying),
      occupation: cleanString(sibling.occupation),
      monthlyIncomeOrFee: cleanNumber(sibling.monthlyIncomeOrFee),
      maritalStatus: cleanString(sibling.maritalStatus),
    }))
    : undefined;

  draft.relatives = Array.isArray(input.relatives)
    ? input.relatives
      .map((relative: any) => ({
        relativeType: relativeTypes.includes(relative.relativeType) ? relative.relativeType : 'paternal_grandfather',
        name: cleanString(relative.name),
        age: cleanNumber(relative.age, true),
        occupation: cleanString(relative.occupation),
        occupationOther: cleanString(relative.occupationOther),
        monthlyIncome: cleanNumber(relative.monthlyIncome),
        supportType: cleanString(relative.supportType),
        supportTypeOther: cleanString(relative.supportTypeOther),
      }))
    : undefined;

  draft.householdAssets = Array.isArray(input.householdAssets)
    ? input.householdAssets
      .map((asset: any) => ({
        assetType: cleanString(asset.assetType),
        quantity: cleanNumber(asset.quantity),
        value: cleanNumber(asset.value),
      }))
      .filter((asset: { assetType?: string }) => Boolean(asset.assetType))
    : undefined;

  return draft;
}

function normalizeConditionalPayload(payload: any) {
  const next = { ...payload };

  if (next.motherAlive === 'no') {
    clearPayloadFields(next, ['motherContact', 'motherSeparationReason', 'motherOccupation', 'motherMonthlyIncome']);
    next.motherIsHousewife = false;
    next.motherRemarried = false;
    next.motherEmploymentStatus = '';
    next.motherIsGuardian = 'no';
  }

  if (next.motherAlive === 'yes') {
    clearPayloadFields(next, ['motherDeathDate', 'motherDeathCause', 'motherSeparationReason']);
    next.motherEmploymentStatus = '';
    next.motherIsHousewife = false;
  }

  if (next.motherAlive === 'separated') {
    clearPayloadFields(next, ['motherDeathDate', 'motherDeathCause', 'motherContact', 'motherOccupation', 'motherMonthlyIncome']);
    next.motherEmploymentStatus = '';
    next.motherIsHousewife = false;
    next.motherIsGuardian = 'no';
  }

  const motherOccupationHasNoIncome = [
    'Housewife',
    'Unemployed',
    'Widow Support / Charity Dependent',
    'Disabled / Unable to Work',
    'Retired',
  ].some((value) => next.motherOccupation === value || String(next.motherOccupation ?? '').startsWith(value));

  if (motherOccupationHasNoIncome) {
    clearPayloadFields(next, ['motherMonthlyIncome']);
    next.motherIsHousewife = next.motherOccupation === 'Housewife';
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

  if (next.guardianFamilyHolder !== 'yes') {
    clearPayloadFields(next, ['guardianFamilyHolderAmount', 'guardianFamilyMembersCount']);
  }

  if (next.relativeInformationDisclosed === false || next.relativeInformationDisclosed === 'false') {
    next.relatives = [];
  }

  if (next.houseOwnershipStatus === 'rented') {
    next.houseOwnershipStatus = 'rent';
  }

  if (next.houseOwnershipStatus !== 'rent') {
    clearPayloadFields(next, ['monthlyRent', 'rentPaidBy', 'houseOwner']);
  }

  // Normalize legacy 'sick' value to 'chronic_illness' for backward compatibility
  if (next.healthStatus === 'sick') {
    next.healthStatus = 'chronic_illness';
  }

  if (next.healthStatus === 'healthy') {
    clearPayloadFields(next, [
      'disabilityDetails', 'disabilityType', 'disabilityCause', 'disabilityCauseDetails',
      'disabilitySince', 'treatmentOngoing', 'chronicDisease', 'specifyDisease',
      'illnessSince', 'treatmentPlace', 'monthlyMedicalExpenses',
    ]);
  }

  if (next.healthStatus === 'chronic_illness') {
    clearPayloadFields(next, [
      'disabilityDetails', 'disabilityType', 'disabilityCause', 'disabilityCauseDetails',
      'disabilitySince', 'treatmentOngoing',
    ]);
  }

  if (next.healthStatus === 'disabled') {
    clearPayloadFields(next, ['chronicDisease', 'specifyDisease', 'illnessSince']);
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
  const HH = String(now.getHours()).padStart(2, '0');
  const MM = String(now.getMinutes()).padStart(2, '0');
  const SS = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `APP-${datePart}-${HH}${MM}${SS}${ms}`;
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

async function validateSubmittedAddress(payload: any) {
  if (payload.status !== 'submitted') return;
  if (!payload.province || !payload.district) return;

  const districtIsInDataset = isValidDistrictForProvince(payload.province, payload.district);
  const districtIsCustom = await prisma.addressOption.findFirst({
    where: {
      type: 'district',
      province: payload.province,
      name: payload.district,
    },
    select: { id: true },
  });

  if (!districtIsInDataset && !districtIsCustom) {
    throw new Error('Selected district does not belong to the selected province');
  }

  if (!payload.tehsil || payload.tehsil === 'unknown') return;

  const tehsilIsInDataset = isValidTehsilForDistrict(payload.province, payload.district, payload.tehsil);
  const tehsilIsCustom = await prisma.addressOption.findFirst({
    where: {
      type: 'tehsil',
      province: payload.province,
      district: payload.district,
      name: payload.tehsil,
    },
    select: { id: true },
  });

  if (!tehsilIsInDataset && !tehsilIsCustom) {
    throw new Error('Selected tehsil does not belong to the selected district');
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const normalizedBody = normalizeConditionalPayload(body);
    const requestedStatus = normalizedBody.status === 'submitted' ? 'submitted' : 'draft';
    const validated = requestedStatus === 'submitted'
      ? getOrphanApplicationSchema.parse({ ...normalizedBody, status: 'submitted' }) as any
      : sanitizeDraftApplication({ ...normalizedBody, status: 'draft' });
    const { siblings, relatives, householdAssets, ...payload } = validated;

    const status = payload.status ?? 'draft';
    await validateSubmittedAddress({ ...payload, status });
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
      {
        message: validationErrorMessage(error),
        issues: error instanceof ZodError ? error.issues : undefined,
      },
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
  const { id } = body;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ message: 'Missing application id' }, { status: 400 });
  }

  try {
    const normalizedBody = normalizeConditionalPayload(body);
    const requestedStatus = normalizedBody.status === 'submitted' ? 'submitted' : 'draft';
    const validated = requestedStatus === 'submitted'
      ? getOrphanApplicationSchema.parse({ ...normalizedBody, status: 'submitted' }) as any
      : sanitizeDraftApplication({ ...normalizedBody, status: 'draft' });
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
    await validateSubmittedAddress(updateData);

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
      {
        message: validationErrorMessage(error),
        issues: error instanceof ZodError ? error.issues : undefined,
      },
      { status: 422 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ message: 'Missing application id' }, { status: 400 });
  }

  const application = await prisma.orphanApplication.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      createdById: true,
      documents: {
        select: {
          fileKey: true,
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ message: 'Application not found' }, { status: 404 });
  }

  if (application.status !== 'draft') {
    return NextResponse.json({ message: 'Only draft applications can be deleted.' }, { status: 409 });
  }

  if (application.createdById !== user.id && user.role !== 'admin') {
    return NextResponse.json({ message: 'Access denied' }, { status: 403 });
  }

  await Promise.allSettled(application.documents.map((document) => deleteFromR2(document.fileKey)));

  await prisma.$transaction([
    prisma.applicationDocument.deleteMany({ where: { applicationId: id } }),
    prisma.sibling.deleteMany({ where: { applicationId: id } }),
    prisma.relative.deleteMany({ where: { applicationId: id } }),
    prisma.householdAsset.deleteMany({ where: { applicationId: id } }),
    prisma.auditLog.deleteMany({ where: { applicationId: id } }),
    prisma.orphanApplication.delete({ where: { id } }),
  ]);

  return NextResponse.json({ message: 'Draft application deleted successfully.' });
}
