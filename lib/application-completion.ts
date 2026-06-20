type CompletionDocument = {
  documentType?: string | null;
};

type CompletionInput = Record<string, unknown> & {
  siblings?: unknown;
  relatives?: unknown;
  householdAssets?: unknown;
  documents?: CompletionDocument[];
};

type CompletionMetrics = {
  filledFieldsCount: number;
  totalMeaningfulFields: number;
  filledFieldsPercentage: number;
};

const meaningfulScalarFields = [
  'fatherName',
  'fatherDob',
  'fatherAge',
  'fatherCnic',
  'fatherEducation',
  'fatherTongue',
  'fatherNativeArea',
  'fatherOccupation',
  'fatherDateOfDeath',
  'fatherCauseOfDeath',
  'motherName',
  'motherDob',
  'motherAge',
  'motherCnic',
  'motherEducation',
  'motherTongue',
  'motherNativeArea',
  'motherAlive',
  'motherSeparationReason',
  'motherEmploymentStatus',
  'motherIsGuardian',
  'motherContact',
  'motherOccupation',
  'motherMonthlyIncome',
  'motherRemarried',
  'motherDeathDate',
  'motherDeathCause',
  'motherHealthStatus',
  'motherDisabilityRemarks',
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
  'paternalGrandfatherName',
  'paternalGrandfatherAge',
  'paternalGrandfatherOccupation',
  'paternalGrandfatherIncome',
  'maternalGrandfatherName',
  'maternalGrandfatherAge',
  'maternalGrandfatherOccupation',
  'maternalGrandfatherIncome',
  'relativeInformationDisclosed',
  'province',
  'city',
  'district',
  'tehsil',
  'residentialArea',
  'fullAddress',
  'longitude',
  'latitude',
  'gpsAccuracyMeters',
  'gpsCapturedAt',
  'houseOwnershipStatus',
  'monthlyRent',
  'rentPaidBy',
  'houseOwner',
  'houseCondition',
  'residenceStructureType',
  'residenceCategory',
  'houseConditionRemarks',
  'electricityAvailable',
  'gasAvailable',
  'waterAvailable',
  'furnishingCondition',
  'furnishingConditionRemarks',
  'childName',
  'gender',
  'caste',
  'sect',
  'religion',
  'specifyReligion',
  'syedStatus',
  'specifyNationality',
  'bFormNumber',
  'dateOfBirth',
  'age',
  'totalSiblings',
  'totalBrothers',
  'totalSisters',
  'registeredBrothers',
  'registeredSisters',
  'siblingsUnder12',
  'childLivesWithMother',
  'livingSituationNotes',
  'healthStatus',
  'disabilityDetails',
  'disabilityType',
  'disabilityCause',
  'disabilityCauseDetails',
  'disabilitySince',
  'treatmentOngoing',
  'chronicDisease',
  'specifyDisease',
  'illnessSince',
  'treatmentPlace',
  'monthlyMedicalExpenses',
  'currentlyStudying',
  'notStudyingReason',
  'educationStartCondition',
  'currentClass',
  'schoolName',
  'schoolAddress',
  'enrolledInMadrasa',
  'madrasaName',
  'madrasaEducationDetails',
  'educationFeeStatus',
  'monthlySchoolFee',
  'schoolDistanceKm',
  'schoolTransportMode',
  'schoolStudyingSince',
  'educationUndertakingAccepted',
  'educationFree',
  'currentSkillLearning',
  'currentSkill',
  'childHobbies',
  'technicalSkillInterest',
  'technicalSkill',
  'totalFamilyMembers',
  'householdHasMonthlyIncome',
  'childEarnsIncome',
  'childWorkNature',
  'assistanceApplied',
  'assistanceAppliedWhere',
  'careerGoal',
  'technicalInterest',
  'learningSkill',
  'childMonthlyIncome',
  'householdEarnersCount',
  'totalHouseholdIncome',
  'receivingOtherAid',
  'otherAidSource',
  'monthlyAidAmount',
  'notAppliedElsewhereReason',
  'principalName',
  'institutionName',
  'verifiedStudentName',
  'verifiedFatherName',
  'verifiedClass',
  'verifiedMonthlyFee',
  'imamName',
  'mosqueName',
  'neighborhoodCity',
  'imamMobile',
  'motherZakatStatus',
] as const;

const siblingFields = [
  'name',
  'relation',
  'dob',
  'age',
  'educationStatus',
  'currentlyStudying',
  'occupation',
  'monthlyIncomeOrFee',
  'maritalStatus',
  'healthStatus',
  'disabilityRemarks',
] as const;

const relativeFields = [
  'relativeType',
  'name',
  'age',
  'occupation',
  'occupationOther',
  'monthlyIncome',
  'supportType',
  'supportTypeOther',
] as const;

const householdAssetFields = ['assetType', 'quantity', 'value'] as const;

const NESTED_SIBLING_FIELD_LIMIT = 24;
const NESTED_RELATIVE_FIELD_LIMIT = 16;
const NESTED_ASSET_FIELD_LIMIT = 16;
const DOCUMENT_FIELD_LIMIT = 12;

const totalMeaningfulFields = meaningfulScalarFields.length
  + NESTED_SIBLING_FIELD_LIMIT
  + NESTED_RELATIVE_FIELD_LIMIT
  + NESTED_ASSET_FIELD_LIMIT
  + DOCUMENT_FIELD_LIMIT;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMeaningfullyFilled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value === true;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function countFilledNestedFields(value: unknown, fields: readonly string[], limit: number) {
  if (!Array.isArray(value)) return 0;

  const filled = value.reduce((count, item) => {
    if (!isPlainObject(item)) return count;
    return count + fields.filter((field) => isMeaningfullyFilled(item[field])).length;
  }, 0);

  return Math.min(filled, limit);
}

function countUploadedDocuments(documents: CompletionDocument[]) {
  const uniqueTypes = new Set(
    documents
      .map((document) => document.documentType)
      .filter((documentType): documentType is string => typeof documentType === 'string' && documentType.trim() !== ''),
  );

  return Math.min(uniqueTypes.size, DOCUMENT_FIELD_LIMIT);
}

export function calculateFilledFields(application: CompletionInput, documents: CompletionDocument[] = application.documents ?? []): CompletionMetrics {
  const scalarCount = meaningfulScalarFields.filter((field) => isMeaningfullyFilled(application[field])).length;
  const filledFieldsCount = scalarCount
    + countFilledNestedFields(application.siblings, siblingFields, NESTED_SIBLING_FIELD_LIMIT)
    + countFilledNestedFields(application.relatives, relativeFields, NESTED_RELATIVE_FIELD_LIMIT)
    + countFilledNestedFields(application.householdAssets, householdAssetFields, NESTED_ASSET_FIELD_LIMIT)
    + countUploadedDocuments(documents);

  return {
    filledFieldsCount,
    totalMeaningfulFields,
    filledFieldsPercentage: Math.min(100, Math.round((filledFieldsCount / totalMeaningfulFields) * 100)),
  };
}

export function completionSelect() {
  return {
    siblings: true,
    relatives: true,
    householdAssets: true,
    documents: {
      select: {
        documentType: true,
      },
    },
  } as const;
}
