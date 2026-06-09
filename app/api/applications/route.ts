import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ZodError } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrphanApplicationSchema } from '@/lib/validation';
import { isValidDistrictForProvince, isValidTehsilForDistrict } from '@/lib/address-utils';
import { deleteFromR2 } from '@/lib/r2';
import { applicationStatuses } from '@/lib/application-workflow';
import { projectMatchesAnyReviewAssignment } from '@/lib/field-workers';
import { logSystemAudit } from '@/lib/system-audit';

async function getUser(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

function collectorPayload(user: NonNullable<Awaited<ReturnType<typeof getUser>>>) {
  return {
    collectorId: user.fieldWorkerId ?? '',
    collectorName: user.name ?? '',
    collectorProject: user.project ?? '',
    collectorCnic: user.cnic ?? '',
    collectorAddress: user.address ?? '',
    collectorContact: user.phoneNumber ?? '',
  };
}

function canCreateApplications(user: NonNullable<Awaited<ReturnType<typeof getUser>>>) {
  return user.role === 'field_worker'
    || user.role === 'admin'
    || user.role === 'super_admin'
    || ((user.role === 'supervisor' || user.role === 'reviewer') && user.canCreateApplications);
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
  'province', 'city', 'district', 'tehsil', 'residentialArea', 'fullAddress', 'houseOwnershipStatus', 'rentPaidBy', 'houseOwner', 'houseCondition',
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

const migrationStatuses = ['pending', 'validated', 'migrated', 'rejected'];
const relativeTypes = ['paternal_grandfather', 'maternal_grandfather', 'paternal_uncle', 'maternal_uncle'];

function cleanString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function cleanNumber(value: unknown, integer = false) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number'
    ? value
    : String(value).trim() === 'no_income'
      ? 0
      : Number(value);
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
    clearPayloadFields(next, ['notStudyingReason']);
  }

  if (next.educationFeeStatus !== 'paid') {
    clearPayloadFields(next, ['monthlySchoolFee']);
  }

  if (next.enrolledInMadrasa === false || next.enrolledInMadrasa === 'false') {
    clearPayloadFields(next, ['madrasaName', 'madrasaEducationDetails', 'educationStartCondition']);
  }

  if (next.receivingOtherAid === false || next.receivingOtherAid === 'false') {
    clearPayloadFields(next, ['otherAidSource', 'monthlyAidAmount']);
  }

  return next;
}

function requiredDocumentTypesForApplication(data: any) {
  const types = [
    'child_photo',
    'child_b_form',
    'father_death_certificate',
  ];

  if (data.motherAlive === 'no') {
    types.push('mother_death_certificate');
  }

  if (data.healthStatus === 'chronic_illness' || data.healthStatus === 'disabled') {
    types.push('medical_report');
  }

  return types;
}

function requiredCnicDocumentGroupsForApplication(data: any) {
  const groups = [];

  if (data.motherAlive !== 'no') {
    groups.push({
      label: "Mother's CNIC",
      combinedType: 'mother_cnic',
      frontType: 'mother_cnic_front',
      backType: 'mother_cnic_back',
      required: true,
    });
  }

  const guardianDetailsNeeded = data.motherAlive !== 'yes' || data.motherIsGuardian !== 'yes';
  if (guardianDetailsNeeded) {
    groups.push({
      label: "Guardian's CNIC",
      combinedType: 'guardian_cnic',
      frontType: 'guardian_cnic_front',
      backType: 'guardian_cnic_back',
      required: true,
    });
  }

  groups.push({
    label: "Father's CNIC",
    combinedType: 'father_cnic',
    frontType: 'father_cnic_front',
    backType: 'father_cnic_back',
    required: false,
  });

  return groups;
}

function validateCnicDocumentGroups(uploadedTypes: Set<string>, data: any) {
  const errors: string[] = [];

  for (const group of requiredCnicDocumentGroupsForApplication(data)) {
    const hasCombined = uploadedTypes.has(group.combinedType);
    const hasFront = uploadedTypes.has(group.frontType);
    const hasBack = uploadedTypes.has(group.backType);
    const hasBothSides = hasFront && hasBack;

    if (hasCombined || hasBothSides) continue;
    if (!group.required && !hasFront && !hasBack) continue;

    if (hasFront || hasBack) {
      errors.push(`${group.label}: upload both front and back sides, or upload one combined CNIC file.`);
    } else {
      errors.push(`${group.label}: upload one combined CNIC file, or upload front and back sides.`);
    }
  }

  return errors;
}

async function validateSubmittedDocuments(applicationId: string, data: any) {
  if (data.status !== 'submitted') return;

  const uploadedDocuments = await prisma.applicationDocument.findMany({
    where: { applicationId },
    select: { documentType: true },
  });
  const uploadedTypes = new Set(uploadedDocuments.map((document) => document.documentType));
  const missingTypes = requiredDocumentTypesForApplication(data).filter((type) => !uploadedTypes.has(type as any));
  const cnicErrors = validateCnicDocumentGroups(uploadedTypes, data);
  const hasCombinedAttestation = uploadedTypes.has('attestation_confirmation' as any);
  const hasSeparateAttestationPages = uploadedTypes.has('attestation_page_1' as any) && uploadedTypes.has('attestation_page_2' as any);

  if (missingTypes.length > 0) {
    throw new Error(`Upload required documents before submitting: ${missingTypes.map((type) => type.replace(/_/g, ' ')).join(', ')}`);
  }

  if (cnicErrors.length > 0) {
    throw new Error(cnicErrors.join(' '));
  }

  if (!hasCombinedAttestation && !hasSeparateAttestationPages) {
    throw new Error('Upload attestation as one PDF containing both pages, or upload attestation page 1 and page 2 separately.');
  }
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

function isStatusOnlyRequest(body: any) {
  const keys = Object.keys(body);
  return keys.every((key) => ['id', 'status', 'reviewComment'].includes(key));
}

async function getSupervisorReviewProjects(user: NonNullable<Awaited<ReturnType<typeof getUser>>>) {
  const departments = await prisma.supervisorDepartment.findMany({
    where: { supervisorId: user.id },
    select: { project: true },
  });
  const assignedProjects = departments.map((department) => department.project);

  return assignedProjects.length ? assignedProjects : user.project ? [user.project] : [];
}

async function updateApplicationStatus(user: NonNullable<Awaited<ReturnType<typeof getUser>>>, body: any) {
  const { id, status, reviewComment } = body;
  if (!applicationStatuses.includes(status)) {
    return NextResponse.json({ message: 'Invalid application status' }, { status: 422 });
  }

  const application = await prisma.orphanApplication.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      createdById: true,
      collectorProject: true,
      registrationNumber: true,
      createdBy: {
        select: { selfRegistered: true },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ message: 'Application not found' }, { status: 404 });
  }

  const comment = typeof reviewComment === 'string' ? reviewComment.trim() : '';
  let allowed = false;
  let action = 'status_changed';

  if (user.role === 'field_worker' && application.createdById === user.id) {
    allowed = application.status === 'needs_correction' && status === 'submitted';
    action = 'resubmitted';
  }

  if (user.role === 'supervisor') {
    if (application.createdById === user.id) {
      return NextResponse.json({ message: 'You cannot supervise an application you created.' }, { status: 403 });
    }

    const assignedProjects = await getSupervisorReviewProjects(user);
    const projectMatches = projectMatchesAnyReviewAssignment(application.collectorProject, assignedProjects, application.createdBy.selfRegistered);
    allowed = projectMatches && application.status === 'submitted' && ['needs_correction', 'supervisor_approved', 'rejected'].includes(status);
    action = status === 'needs_correction' ? 'returned_by_supervisor' : status === 'supervisor_approved' ? 'approved_by_supervisor' : 'rejected_by_supervisor';

    if (status === 'needs_correction' && !comment) {
      return NextResponse.json({ message: 'Correction comment is required.' }, { status: 422 });
    }
  }

  if (user.role === 'reviewer') {
    if (application.createdById === user.id) {
      return NextResponse.json({ message: 'You cannot review an application you created.' }, { status: 403 });
    }

    allowed = application.status === 'supervisor_approved' && ['reviewer_approved', 'rejected'].includes(status);
    action = status === 'reviewer_approved' ? 'approved_by_reviewer' : 'rejected_by_reviewer';
  }

  if (user.role === 'admin') {
    allowed = application.status === 'reviewer_approved' && ['admin_approved', 'rejected'].includes(status);
    action = status === 'admin_approved' ? 'approved_by_admin' : 'rejected_by_admin';
  }

  if (user.role === 'super_admin') {
    allowed = (
      (application.status === 'submitted' && ['needs_correction', 'supervisor_approved', 'rejected'].includes(status)) ||
      (application.status === 'supervisor_approved' && ['reviewer_approved', 'rejected'].includes(status)) ||
      (application.status === 'reviewer_approved' && ['admin_approved', 'rejected'].includes(status)) ||
      (application.status === 'admin_approved' && status === 'migrated') ||
      (application.status === 'validated' && status === 'migrated')
    );
    action = status === 'needs_correction'
      ? 'returned_by_super_admin'
      : status === 'supervisor_approved'
        ? 'supervisor_approved_by_super_admin'
        : status === 'reviewer_approved'
          ? 'reviewer_approved_by_super_admin'
          : status === 'admin_approved'
            ? 'approved_by_super_admin'
            : status === 'rejected'
              ? 'rejected_by_super_admin'
              : 'status_changed_by_super_admin';

    if (status === 'needs_correction' && !comment) {
      return NextResponse.json({ message: 'Correction comment is required.' }, { status: 422 });
    }
  }

  if (!allowed) {
    return NextResponse.json({ message: 'This status transition is not allowed for your role.' }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.orphanApplication.update({
      where: { id },
      data: {
        status,
        updatedById: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        tableName: 'OrphanApplication',
        recordId: id,
        action,
        actorId: user.id,
        applicationId: id,
        details: {
          from: application.status,
          to: status,
          comment,
        },
      },
    });

    return next;
  });

  return NextResponse.json(updated);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!canCreateApplications(user)) {
    return NextResponse.json({ message: 'You do not have permission to create applications.' }, { status: 403 });
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
    if (status === 'submitted') {
      throw new Error('Save the application as a draft, upload all required documents and attestation, then submit.');
    }
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
    if (isStatusOnlyRequest(body)) {
      return updateApplicationStatus(user, body);
    }

    const normalizedBody = normalizeConditionalPayload(body);
    const requestedStatus = normalizedBody.status === 'submitted' ? 'submitted' : 'draft';
    const validated = requestedStatus === 'submitted'
      ? getOrphanApplicationSchema.parse({ ...normalizedBody, status: 'submitted' }) as any
      : sanitizeDraftApplication({ ...normalizedBody, status: 'draft' });
    const application = await prisma.orphanApplication.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    const canReviewerEdit = user.role === 'reviewer' && application.status === 'supervisor_approved';
    const canAdminEdit = user.role === 'admin' && application.status === 'reviewer_approved';
    const canSuperAdminEdit = user.role === 'super_admin';
    const canOwnerEdit = user.role !== 'admin' && application.createdById === user.id && canCreateApplications(user);
    const comment = typeof body.reviewComment === 'string' ? body.reviewComment.trim() : '';

    if (!canOwnerEdit && !canReviewerEdit && !canAdminEdit && !canSuperAdminEdit) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    if (canOwnerEdit && !['draft', 'needs_correction'].includes(application.status) && user.role !== 'super_admin') {
      return NextResponse.json({ message: 'Only draft or returned applications can be edited.' }, { status: 409 });
    }

    if (canAdminEdit && !comment) {
      return NextResponse.json({ message: 'Edit comment is required.' }, { status: 422 });
    }

    const updateData: any = {
      ...validated,
      updatedById: user.id,
      status: canOwnerEdit ? validated.status ?? application.status : application.status,
    };
    await validateSubmittedAddress(updateData);
    await validateSubmittedDocuments(id, updateData);

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
    if (user.role !== 'super_admin') {
      delete updateData.migrationStatus;
      delete updateData.mainSaibanId;
      delete updateData.migrationErrors;
    }

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

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.orphanApplication.update({
        where: { id },
        data: updateData,
      });

      if (user.role === 'reviewer' || user.role === 'admin' || user.role === 'super_admin') {
        await tx.auditLog.create({
          data: {
            tableName: 'OrphanApplication',
            recordId: id,
            action: user.role === 'reviewer' ? 'edited_by_reviewer' : user.role === 'super_admin' ? 'edited_by_super_admin' : 'edited_by_admin',
            actorId: user.id,
            applicationId: id,
            details: {
              status: application.status,
              comment,
            },
          },
        });
      }

      if (canOwnerEdit && application.status !== updateData.status && updateData.status === 'submitted') {
        await tx.auditLog.create({
          data: {
            tableName: 'OrphanApplication',
            recordId: id,
            action: application.status === 'needs_correction' ? 'resubmitted' : 'submitted',
            actorId: user.id,
            applicationId: id,
            details: {
              from: application.status,
              to: updateData.status,
            },
          },
        });
      }

      return next;
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
      registrationNumber: true,
      childName: true,
      collectorName: true,
      collectorProject: true,
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

  if (application.status !== 'draft' && user.role !== 'super_admin') {
    return NextResponse.json({ message: 'Only draft applications can be deleted.' }, { status: 409 });
  }

  if (application.createdById !== user.id && !['admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ message: 'Access denied' }, { status: 403 });
  }
  if (application.createdById === user.id && !canCreateApplications(user)) {
    return NextResponse.json({ message: 'You do not have permission to manage application drafts.' }, { status: 403 });
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

  await logSystemAudit({
    action: user.role === 'super_admin' ? 'application_deleted_by_super_admin' : 'draft_application_deleted',
    entityType: 'application',
    entityId: application.id,
    entityLabel: application.registrationNumber ?? application.childName ?? application.id,
    actorId: user.id,
    details: {
      status: application.status,
      childName: application.childName,
      collectorName: application.collectorName,
      collectorProject: application.collectorProject,
    },
  });

  return NextResponse.json({ message: user.role === 'super_admin' ? 'Application deleted successfully.' : 'Draft application deleted successfully.' });
}

