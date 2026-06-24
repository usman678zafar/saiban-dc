import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { compare } from 'bcryptjs';
import { ZodError } from 'zod';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrphanApplicationSchema } from '@/lib/validation';
import { isValidDistrictForProvince, isValidProvince, isValidTehsilForDistrict } from '@/lib/address-utils';
import { applicationStatuses } from '@/lib/application-workflow';
import { collectorProjectReviewWhere, projectMatchesAnyReviewAssignment } from '@/lib/field-workers';
import { logSystemAudit } from '@/lib/system-audit';
import { calculateFilledFields, completionSelect } from '@/lib/application-completion';
import { applicationSearchWhere } from '@/lib/application-search';
import { applicationDeletionSelect, deleteApplicationRecords } from '@/lib/application-deletion';

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
  'motherHealthStatus', 'motherDisabilityRemarks',
  'guardianName', 'guardianRelationship', 'guardianGender', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue',
  'guardianNativeArea', 'guardianContact', 'guardianZakatStatus', 'guardianOccupation', 'guardianFamilyHolder',
  'guardianHealthStatus', 'guardianDisabilityRemarks',
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
  'fatherAge', 'motherAge', 'guardianAge', 'guardianFamilyMembersCount', 'paternalGrandfatherAge', 'maternalGrandfatherAge',
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
  'fatherDob', 'fatherDateOfDeath', 'motherDob', 'motherDeathDate', 'guardianDob', 'gpsCapturedAt', 'dateOfBirth',
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
      healthStatus: cleanString(sibling.healthStatus),
      disabilityRemarks: cleanString(sibling.disabilityRemarks),
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

  if (next.motherHealthStatus !== 'disabled') {
    clearPayloadFields(next, ['motherDisabilityRemarks']);
  }

  if (next.motherAlive === 'yes' && next.motherIsGuardian === 'yes') {
    clearPayloadFields(next, [
      'guardianName',
      'guardianRelationship',
      'guardianGender',
      'guardianDob',
      'guardianAge',
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
      'guardianHealthStatus',
      'guardianDisabilityRemarks',
      'guardianSignatureFileKey',
    ]);
  }

  if (next.guardianHealthStatus !== 'disabled') {
    clearPayloadFields(next, ['guardianDisabilityRemarks']);
  }

  if (Array.isArray(next.siblings)) {
    next.siblings = next.siblings.map((sibling: any) => ({
      ...sibling,
      ...(sibling.healthStatus === 'disabled' ? {} : { disabilityRemarks: '' }),
    }));
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

  const isCurrentlyStudying = next.currentlyStudying === true || next.currentlyStudying === 'true';
  const isEnrolledInMadrasa = next.enrolledInMadrasa === true || next.enrolledInMadrasa === 'true';
  const hasPaidEducationFee = next.educationFree === 'no' || next.educationFeeStatus === 'paid';

  if (!isCurrentlyStudying) {
    clearPayloadFields(next, ['currentClass', 'schoolName', 'schoolAddress', 'educationFeeStatus']);
  }

  if (isCurrentlyStudying) {
    clearPayloadFields(next, ['notStudyingReason']);
  }

  if ((!isCurrentlyStudying && !isEnrolledInMadrasa) || !hasPaidEducationFee) {
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

async function validateAddressSelection(payload: any) {
  if (!payload.province) {
    if (payload.district || payload.tehsil) {
      throw new Error('Select a province before selecting district or tehsil');
    }
    return;
  }

  if (!isValidProvince(payload.province)) {
    throw new Error('Selected province is invalid');
  }

  if (!payload.district) {
    if (payload.tehsil && payload.tehsil !== 'unknown') {
      throw new Error('Select a district before selecting tehsil');
    }
    return;
  }

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
  return keys.every((key) => ['id', 'status', 'reviewComment', 'returnTo'].includes(key));
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
  const { id, reviewComment } = body;
  const returnTo = body.returnTo === 'supervisor' || body.returnTo === 'reviewer' ? body.returnTo as 'supervisor' | 'reviewer' : null;
  const status = returnTo === 'supervisor'
    ? 'submitted'
    : returnTo === 'reviewer'
      ? 'supervisor_approved'
      : body.status;
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
    if (returnTo) {
      allowed = ['reviewer_approved', 'admin_on_hold'].includes(application.status);
      action = returnTo === 'supervisor' ? 'returned_by_admin_to_supervisor' : 'returned_by_admin_to_reviewer';
      if (!comment) {
        return NextResponse.json({ message: 'Return remarks are required.' }, { status: 422 });
      }
    } else {
      allowed = (
        (application.status === 'reviewer_approved' && ['admin_on_hold', 'admin_approved', 'rejected'].includes(status)) ||
        (application.status === 'admin_on_hold' && ['admin_approved', 'rejected'].includes(status))
      );
      action = status === 'admin_on_hold'
        ? 'held_by_admin'
        : status === 'admin_approved'
          ? 'approved_by_admin'
          : 'rejected_by_admin';

      if (status === 'admin_on_hold' && !comment) {
        return NextResponse.json({ message: 'Hold reason is required.' }, { status: 422 });
      }
    }
  }

  if (user.role === 'super_admin') {
    if (returnTo) {
      allowed = ['reviewer_approved', 'admin_on_hold'].includes(application.status);
      action = returnTo === 'supervisor' ? 'returned_by_super_admin_to_supervisor' : 'returned_by_super_admin_to_reviewer';
      if (!comment) {
        return NextResponse.json({ message: 'Return remarks are required.' }, { status: 422 });
      }
    } else {
      allowed = (
        (application.status === 'submitted' && ['needs_correction', 'supervisor_approved', 'rejected'].includes(status)) ||
        (application.status === 'supervisor_approved' && ['reviewer_approved', 'rejected'].includes(status)) ||
        (application.status === 'reviewer_approved' && ['admin_on_hold', 'admin_approved', 'rejected'].includes(status)) ||
        (application.status === 'admin_on_hold' && ['admin_approved', 'rejected'].includes(status)) ||
        (application.status === 'admin_approved' && status === 'migrated') ||
        (application.status === 'validated' && status === 'migrated')
      );
      action = status === 'needs_correction'
        ? 'returned_by_super_admin'
        : status === 'supervisor_approved'
          ? 'supervisor_approved_by_super_admin'
          : status === 'reviewer_approved'
            ? 'reviewer_approved_by_super_admin'
            : status === 'admin_on_hold'
              ? 'held_by_super_admin'
              : status === 'admin_approved'
                ? 'approved_by_super_admin'
                : status === 'rejected'
                  ? 'rejected_by_super_admin'
                  : 'status_changed_by_super_admin';

      if (['admin_on_hold', 'needs_correction'].includes(status) && !comment) {
        return NextResponse.json({ message: status === 'admin_on_hold' ? 'Hold reason is required.' : 'Correction comment is required.' }, { status: 422 });
      }
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
          ...(returnTo ? { returnTo } : {}),
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
    if (status === 'submitted') {
      await validateAddressSelection({ ...payload, status });
    }
    const application = await prisma.orphanApplication.create({
      data: {
        ...payload,
        ...calculateFilledFields({ ...payload, siblings: siblings ?? [], relatives: relatives ?? [], householdAssets: householdAssets ?? [], documents: [] }),
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
    const canAdminEdit = user.role === 'admin' && ['reviewer_approved', 'admin_on_hold'].includes(application.status);
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
    const shouldStrictlyValidateAddress = updateData.status === 'submitted' || !canOwnerEdit;
    if (shouldStrictlyValidateAddress) {
      await validateAddressSelection(updateData);
    }
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
        include: completionSelect(),
      });

      const completion = calculateFilledFields(next);
      const completedNext = await tx.orphanApplication.update({
        where: { id },
        data: completion,
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

      return completedNext;
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

type BulkDeleteFilters = {
  q?: unknown;
  status?: unknown;
  department?: unknown;
  completion?: unknown;
  filled?: unknown;
  dateType?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
};

const bulkCompletionFilters = {
  '0-10': { min: 0, max: 10 },
  '11-25': { min: 11, max: 25 },
  '26-50': { min: 26, max: 50 },
  '51-75': { min: 51, max: 75 },
  '76-100': { min: 76, max: 100 },
} as const;

function stringFilter(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseBulkDeleteDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endOfBulkDeleteDate(value: unknown) {
  const date = parseBulkDeleteDate(value);
  if (!date) return null;
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function bulkStatusWhere(status: string): Prisma.OrphanApplicationWhereInput {
  switch (status) {
    case 'pending_admin_review':
      return { status: 'reviewer_approved' };
    case 'drafts':
      return { status: 'draft' };
    case 'submitted':
      return { status: 'submitted' };
    case 'needs_correction':
      return { status: 'needs_correction' };
    case 'supervisor_approved':
      return { status: 'supervisor_approved' };
    case 'admin_approved':
      return { status: 'admin_approved' };
    case 'admin_on_hold':
      return { status: 'admin_on_hold' };
    case 'validated':
      return { status: 'validated' };
    case 'rejected':
      return { status: 'rejected' };
    case 'migrated':
      return { status: 'migrated' };
    default:
      return {};
  }
}

function buildBulkDeleteWhere(filters: BulkDeleteFilters): Prisma.OrphanApplicationWhereInput {
  const search = stringFilter(filters.q);
  const status = stringFilter(filters.status);
  const department = stringFilter(filters.department);
  const completion = stringFilter(filters.completion ?? filters.filled);
  const dateType = filters.dateType === 'createdAt' ? 'createdAt' : 'updatedAt';
  const dateFrom = parseBulkDeleteDate(filters.dateFrom);
  const dateTo = endOfBulkDeleteDate(filters.dateTo);
  const completionDefinition = bulkCompletionFilters[completion as keyof typeof bulkCompletionFilters];

  const whereParts: Prisma.OrphanApplicationWhereInput[] = [
    applicationSearchWhere(search),
    bulkStatusWhere(status),
    department && department !== 'all' ? collectorProjectReviewWhere(department) : {},
    completionDefinition
      ? {
        filledFieldsPercentage: {
          ...(completionDefinition.min !== undefined ? { gte: completionDefinition.min } : {}),
          ...(completionDefinition.max !== undefined ? { lte: completionDefinition.max } : {}),
        },
      }
      : {},
    dateFrom || dateTo
      ? {
        [dateType]: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      }
      : {},
  ].filter((part) => Object.keys(part).length > 0);

  return whereParts.length ? { AND: whereParts } : {};
}

function hasActiveBulkDeleteFilter(filters: BulkDeleteFilters) {
  return Boolean(
    stringFilter(filters.q)
    || (stringFilter(filters.status) && stringFilter(filters.status) !== 'all')
    || (stringFilter(filters.department) && stringFilter(filters.department) !== 'all')
    || (stringFilter(filters.completion ?? filters.filled) && stringFilter(filters.completion ?? filters.filled) !== 'all')
    || parseBulkDeleteDate(filters.dateFrom)
    || parseBulkDeleteDate(filters.dateTo),
  );
}

async function handleBulkDeleteApplications(
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>,
  body: any,
) {
  if (user.role !== 'super_admin') {
    return NextResponse.json({ message: 'Super admin access required for bulk deletion.' }, { status: 403 });
  }

  const filters = body?.filters && typeof body.filters === 'object' ? body.filters as BulkDeleteFilters : {};
  if (!hasActiveBulkDeleteFilter(filters)) {
    return NextResponse.json({ message: 'Apply at least one filter before deleting all matching applications.' }, { status: 422 });
  }

  const where = buildBulkDeleteWhere(filters);
  const [total, nonDraftCount] = await Promise.all([
    prisma.orphanApplication.count({ where }),
    prisma.orphanApplication.count({ where: { AND: [where, { status: { not: 'draft' } }] } }),
  ]);

  if (total === 0) {
    return NextResponse.json({ message: 'No applications match these filters.' }, { status: 422 });
  }

  const expectedConfirmation = `DELETE ${total}`;
  if (body?.confirmationText !== expectedConfirmation) {
    return NextResponse.json({ message: `Type ${expectedConfirmation} to confirm this bulk deletion.` }, { status: 422 });
  }

  if (nonDraftCount > 0) {
    if (typeof body?.adminPassword !== 'string' || body.adminPassword.length === 0) {
      return NextResponse.json({ message: 'Admin password is required because this delete includes non-draft applications.' }, { status: 422 });
    }

    const passwordMatches = await compare(body.adminPassword, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json({ message: 'Admin password is incorrect.' }, { status: 403 });
    }
  }

  let deletedCount = 0;
  const batchSize = 25;
  while (true) {
    const applications = await prisma.orphanApplication.findMany({
      where,
      take: batchSize,
      orderBy: { updatedAt: 'asc' },
      select: applicationDeletionSelect,
    });

    if (applications.length === 0) break;
    await deleteApplicationRecords(applications);
    deletedCount += applications.length;
  }

  await logSystemAudit({
    action: nonDraftCount > 0 ? 'bulk_applications_deleted_by_super_admin' : 'bulk_draft_applications_deleted_by_super_admin',
    entityType: 'application',
    entityId: 'bulk-delete',
    entityLabel: `${deletedCount} applications`,
    actorId: user.id,
    details: {
      deletedCount,
      nonDraftCount,
      filters: {
        q: stringFilter(filters.q),
        status: stringFilter(filters.status),
        department: stringFilter(filters.department),
        completion: stringFilter(filters.completion ?? filters.filled),
        dateType: filters.dateType === 'createdAt' ? 'createdAt' : 'updatedAt',
        dateFrom: stringFilter(filters.dateFrom),
        dateTo: stringFilter(filters.dateTo),
      },
    },
  });

  return NextResponse.json({
    message: `Deleted ${deletedCount} application${deletedCount === 1 ? '' : 's'} successfully.`,
    deletedCount,
    nonDraftCount,
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body?.deleteMatching === true) {
    return handleBulkDeleteApplications(user, body);
  }

  const id = body?.id;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ message: 'Missing application id' }, { status: 400 });
  }

  const application = await prisma.orphanApplication.findUnique({
    where: { id },
    select: applicationDeletionSelect,
  });

  if (!application) {
    return NextResponse.json({ message: 'Application not found' }, { status: 404 });
  }

  if (application.status !== 'draft' && user.role !== 'super_admin') {
    return NextResponse.json({ message: 'Only draft applications can be deleted.' }, { status: 409 });
  }

  if (application.status !== 'draft') {
    if (typeof body?.adminPassword !== 'string' || body.adminPassword.length === 0) {
      return NextResponse.json({ message: 'Admin password is required to delete non-draft applications.' }, { status: 422 });
    }

    const passwordMatches = await compare(body.adminPassword, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json({ message: 'Admin password is incorrect.' }, { status: 403 });
    }
  }

  if (application.createdById !== user.id && !['admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ message: 'Access denied' }, { status: 403 });
  }
  if (application.createdById === user.id && !canCreateApplications(user)) {
    return NextResponse.json({ message: 'You do not have permission to manage application drafts.' }, { status: 403 });
  }

  await deleteApplicationRecords([application]);

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

