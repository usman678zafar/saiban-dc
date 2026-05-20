import type { FormData } from '@/components/orphan-application-wizard';
import { householdAssetRowsToOtherItems, householdAssetRowsToSelection } from '@/lib/household-assets';

const childSpecificFields: Array<keyof FormData> = [
  'registrationNumber',
  'childName',
  'gender',
  'caste',
  'sect',
  'religion',
  'specifyReligion',
  'syedStatus',
  'nationality',
  'specifyNationality',
  'bFormNumber',
  'dateOfBirth',
  'age',
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
  'careerGoal',
  'technicalInterest',
  'learningSkill',
  'childEarnsIncome',
  'childWorkNature',
  'childMonthlyIncome',
  'guardianSignatureFileKey',
  'termsAccepted',
  'documents',
];

function toWizardValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return String(value);
  return value;
}

export function buildDuplicateFamilyInitialData(application: any): Partial<FormData> {
  const initialData: Record<string, unknown> = {};

  Object.entries(application).forEach(([key, value]) => {
    if (['id', 'createdAt', 'updatedAt', 'submittedAt', 'termsAcceptedAt', 'siblings', 'relatives', 'householdAssets'].includes(key)) return;
    initialData[key] = toWizardValue(value);
  });

  childSpecificFields.forEach((field) => {
    if (field === 'nationality') {
      initialData[field] = 'Pakistani';
    } else if (field === 'currentlyStudying' || field === 'enrolledInMadrasa' || field === 'educationUndertakingAccepted' || field === 'termsAccepted') {
      initialData[field] = false;
    } else if (field === 'childHobbies' || field === 'documents') {
      initialData[field] = [];
    } else {
      initialData[field] = '';
    }
  });

  initialData.status = 'draft';
  initialData.relativeInformationDisclosed = application.relativeInformationDisclosed === true ? 'yes' : application.relativeInformationDisclosed === false ? 'no' : '';
  initialData.siblings = application.siblings.map((sibling: any) => ({
    name: sibling.name ?? '',
    relation: sibling.relation ?? 'brother',
    dob: sibling.dob ? sibling.dob.toISOString().slice(0, 10) : '',
    age: sibling.age?.toString() ?? '',
    educationStatus: sibling.educationStatus ?? '',
    currentlyStudying: sibling.currentlyStudying === true ? 'yes' : sibling.currentlyStudying === false ? 'no' : '',
    occupation: sibling.occupation ?? '',
    monthlyIncomeOrFee: sibling.monthlyIncomeOrFee?.toString() ?? '',
    maritalStatus: sibling.maritalStatus ?? '',
  }));
  initialData.totalSiblings = application.siblings.length ? String(application.siblings.length) : application.totalSiblings?.toString() ?? '';
  initialData.relatives = application.relatives.map((relative: any) => ({
    relativeType: relative.relativeType ?? 'paternal_grandfather',
    name: relative.name ?? '',
    age: relative.age?.toString() ?? '',
    monthlyIncome: relative.monthlyIncome?.toString() ?? '',
    occupation: relative.occupation ?? '',
    occupationOther: relative.occupationOther ?? '',
    supportType: relative.supportType ?? '',
    supportTypeOther: relative.supportTypeOther ?? '',
  }));
  const assetRows = application.householdAssets.map((asset: any) => ({
    assetType: asset.assetType ?? '',
    quantity: asset.quantity,
    value: asset.value,
  }));
  initialData.householdAssetSelection = householdAssetRowsToSelection(assetRows);
  initialData.otherHouseholdAssets = householdAssetRowsToOtherItems(assetRows);

  return initialData as Partial<FormData>;
}

