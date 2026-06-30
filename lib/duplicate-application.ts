import type { FormData } from '@/components/orphan-application-wizard';
import { applicationToWizardData } from '@/lib/application-wizard-data';

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

export function buildDuplicateFamilyInitialData(application: any): Partial<FormData> {
  const initialData = applicationToWizardData(application);
  const writableInitialData = initialData as Partial<Record<keyof FormData, unknown>>;

  childSpecificFields.forEach((field) => {
    if (field === 'nationality') {
      writableInitialData[field] = 'Pakistani';
    } else if (
      field === 'currentlyStudying'
      || field === 'enrolledInMadrasa'
      || field === 'educationUndertakingAccepted'
      || field === 'termsAccepted'
    ) {
      writableInitialData[field] = false;
    } else if (field === 'childHobbies' || field === 'documents') {
      writableInitialData[field] = [];
    } else {
      writableInitialData[field] = '';
    }
  });

  initialData.status = 'draft';
  initialData.totalSiblings = application.siblings?.length
    ? String(application.siblings.length)
    : application.totalSiblings?.toString() ?? '';

  return initialData;
}
