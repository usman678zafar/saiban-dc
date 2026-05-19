'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { labels } from '@/lib/labels';
import { pakistanAddressData } from '@/lib/pakistan-address-data';
import { getDistrictsByProvince, getTehsilsByDistrict } from '@/lib/address-utils';
import {
  HOUSEHOLD_ASSET_KEYS,
  assetUsesGrams,
  createDefaultHouseholdAssetSelection,
  householdAssetDisplayLabel,
  mergeHouseholdAssetSelection,
  householdAssetRowsToSelection,
  householdSelectionToApiRows,
  type HouseholdAssetKey,
  type HouseholdAssetEntry,
  type HouseholdAssetSelection,
  type OtherHouseholdAssetInput,
} from '@/lib/household-assets';
import FileUpload from './file-upload';
import { useNavigationLoading } from './navigation-loading';
import { downloadAttestationPdf, printAttestationForm } from './attestation-form';

type SiblingInput = {
  id?: string;
  name: string;
  relation: string;
  dob: string;
  age: string;
  educationStatus: string;
  currentlyStudying: string;
  occupation: string;
  monthlyIncomeOrFee: string;
  maritalStatus: string;
};

type RelativeInput = {
  id?: string;
  relativeType: 'paternal_grandfather' | 'maternal_grandfather' | 'paternal_uncle' | 'maternal_uncle';
  name: string;
  age: string;
  occupation: string;
  occupationOther: string;
  monthlyIncome: string;
  supportType: string;
  supportTypeOther: string;
};

type DocumentInput = {
  id: string;
  documentType: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  fileKey: string;
};

type AddressOptionInput = {
  id: string;
  type: 'district' | 'tehsil';
  province: string;
  district: string | null;
  name: string;
};

export type FormData = {
  registrationNumber: string;
  collectorId: string;
  collectorName: string;
  collectorProject: string;
  collectorCnic: string;
  collectorAddress: string;
  collectorContact: string;
  fatherName: string;
  fatherDob: string;
  fatherAge: string;
  fatherCnic: string;
  fatherEducation: string;
  fatherTongue: string;
  fatherNativeArea: string;
  fatherOccupation: string;
  fatherDateOfDeath: string;
  fatherCauseOfDeath: string;
  motherName: string;
  motherDob: string;
  motherAge: string;
  motherCnic: string;
  motherEducation: string;
  motherTongue: string;
  motherNativeArea: string;
  motherAlive: string;
  motherSeparationReason: string;
  motherEmploymentStatus: string;
  motherIsGuardian: string;
  motherContact: string;
  motherIsHousewife: boolean;
  motherOccupation: string;
  motherMonthlyIncome: string;
  motherRemarried: boolean;
  motherDeathDate: string;
  motherDeathCause: string;
  guardianName: string;
  guardianRelationship: string;
  guardianGender: string;
  guardianCnic: string;
  guardianEducation: string;
  guardianMotherTongue: string;
  guardianNativeArea: string;
  guardianContact: string;
  guardianZakatStatus: string;
  guardianOccupation: string;
  guardianFamilyHolder: string;
  guardianFamilyHolderAmount: string;
  guardianFamilyMembersCount: string;
  guardianMonthlyIncome: string;
  paternalGrandfatherName: string;
  paternalGrandfatherAge: string;
  paternalGrandfatherOccupation: string;
  paternalGrandfatherIncome: string;
  maternalGrandfatherName: string;
  maternalGrandfatherAge: string;
  maternalGrandfatherOccupation: string;
  maternalGrandfatherIncome: string;
  relativeInformationDisclosed: string;
  province: string;
  city: string;
  district: string;
  tehsil: string;
  residentialArea: string;
  fullAddress: string;
  longitude: string;
  latitude: string;
  gpsAccuracyMeters: string;
  gpsCapturedAt: string;
  houseOwnershipStatus: string;
  monthlyRent: string;
  rentPaidBy: string;
  houseOwner: string;
  houseCondition: string;
  residenceStructureType: string;
  residenceCategory: string;
  houseConditionRemarks: string;
  electricityAvailable: boolean;
  gasAvailable: boolean;
  waterAvailable: boolean;
  furnishingCondition: string;
  furnishingConditionRemarks: string;
  childName: string;
  gender: string;
  caste: string;
  sect: string;
  religion: string;
  specifyReligion: string;
  syedStatus: string;
  nationality: string;
  specifyNationality: string;
  bFormNumber: string;
  dateOfBirth: string;
  age: string;
  totalSiblings: string;
  totalBrothers: string;
  totalSisters: string;
  registeredBrothers: string;
  registeredSisters: string;
  siblingsUnder12: string;
  childLivesWithMother: boolean;
  livingSituationNotes: string;
  healthStatus: string;
  disabilityDetails: string;
  disabilityType: string;
  disabilityCause: string;
  disabilityCauseDetails: string;
  disabilitySince: string;
  treatmentOngoing: string;
  chronicDisease: string;
  specifyDisease: string;
  illnessSince: string;
  treatmentPlace: string;
  monthlyMedicalExpenses: string;
  currentlyStudying: boolean;
  notStudyingReason: string;
  educationStartCondition: string;
  currentClass: string;
  schoolName: string;
  schoolAddress: string;
  enrolledInMadrasa: boolean;
  madrasaName: string;
  madrasaEducationDetails: string;
  educationFeeStatus: string;
  monthlySchoolFee: string;
  schoolDistanceKm: string;
  schoolTransportMode: string;
  schoolStudyingSince: string;
  educationUndertakingAccepted: boolean;
  educationFree: string;
  currentSkillLearning: string;
  currentSkill: string;
  childHobbies: string[];
  technicalSkillInterest: string;
  technicalSkill: string;
  totalFamilyMembers: string;
  householdHasMonthlyIncome: string;
  childEarnsIncome: string;
  childWorkNature: string;
  assistanceApplied: string;
  assistanceAppliedWhere: string;
  careerGoal: string;
  technicalInterest: string;
  learningSkill: string;
  childMonthlyIncome: string;
  householdEarnersCount: string;
  totalHouseholdIncome: string;
  receivingOtherAid: boolean;
  otherAidSource: string;
  monthlyAidAmount: string;
  notAppliedElsewhereReason: string;
  guardianSignatureFileKey: string;
  termsAccepted: boolean;
  status: 'draft' | 'submitted';
  siblings: SiblingInput[];
  relatives: RelativeInput[];
  householdAssetSelection: HouseholdAssetSelection;
  otherHouseholdAssets: OtherHouseholdAssetInput[];
  documents: DocumentInput[];
};

const defaultData: FormData = {
  registrationNumber: '',
  collectorId: '',
  collectorName: '',
  collectorProject: '',
  collectorCnic: '',
  collectorAddress: '',
  collectorContact: '',
  fatherName: '',
  fatherDob: '',
  fatherAge: '',
  fatherCnic: '',
  fatherEducation: '',
  fatherTongue: '',
  fatherNativeArea: '',
  fatherOccupation: '',
  fatherDateOfDeath: '',
  fatherCauseOfDeath: '',
  motherName: '',
  motherDob: '',
  motherAge: '',
  motherCnic: '',
  motherEducation: '',
  motherTongue: '',
  motherNativeArea: '',
  motherAlive: '',
  motherSeparationReason: '',
  motherEmploymentStatus: '',
  motherIsGuardian: '',
  motherContact: '',
  motherIsHousewife: false,
  motherOccupation: '',
  motherMonthlyIncome: '',
  motherRemarried: false,
  motherDeathDate: '',
  motherDeathCause: '',
  guardianName: '',
  guardianRelationship: '',
  guardianGender: '',
  guardianCnic: '',
  guardianEducation: '',
  guardianMotherTongue: '',
  guardianNativeArea: '',
  guardianContact: '',
  guardianZakatStatus: '',
  guardianOccupation: '',
  guardianFamilyHolder: '',
  guardianFamilyHolderAmount: '',
  guardianFamilyMembersCount: '',
  guardianMonthlyIncome: '',
  paternalGrandfatherName: '',
  paternalGrandfatherAge: '',
  paternalGrandfatherOccupation: '',
  paternalGrandfatherIncome: '',
  maternalGrandfatherName: '',
  maternalGrandfatherAge: '',
  maternalGrandfatherOccupation: '',
  maternalGrandfatherIncome: '',
  relativeInformationDisclosed: '',
  province: '',
  city: '',
  district: '',
  tehsil: '',
  residentialArea: '',
  fullAddress: '',
  longitude: '',
  latitude: '',
  gpsAccuracyMeters: '',
  gpsCapturedAt: '',
  houseOwnershipStatus: '',
  monthlyRent: '',
  rentPaidBy: '',
  houseOwner: '',
  houseCondition: '',
  residenceStructureType: '',
  residenceCategory: '',
  houseConditionRemarks: '',
  electricityAvailable: false,
  gasAvailable: false,
  waterAvailable: false,
  furnishingCondition: '',
  furnishingConditionRemarks: '',
  childName: '',
  gender: '',
  caste: '',
  sect: '',
  religion: '',
  specifyReligion: '',
  syedStatus: '',
  nationality: 'Pakistani',
  specifyNationality: '',
  bFormNumber: '',
  dateOfBirth: '',
  age: '',
  totalSiblings: '',
  totalBrothers: '',
  totalSisters: '',
  registeredBrothers: '',
  registeredSisters: '',
  siblingsUnder12: '',
  childLivesWithMother: false,
  livingSituationNotes: '',
  healthStatus: '',
  disabilityDetails: '',
  disabilityType: '',
  disabilityCause: '',
  disabilityCauseDetails: '',
  disabilitySince: '',
  treatmentOngoing: '',
  chronicDisease: '',
  specifyDisease: '',
  illnessSince: '',
  treatmentPlace: '',
  monthlyMedicalExpenses: '',
  currentlyStudying: false,
  notStudyingReason: '',
  educationStartCondition: '',
  currentClass: '',
  schoolName: '',
  schoolAddress: '',
  enrolledInMadrasa: false,
  madrasaName: '',
  madrasaEducationDetails: '',
  educationFeeStatus: '',
  monthlySchoolFee: '',
  schoolDistanceKm: '',
  schoolTransportMode: '',
  schoolStudyingSince: '',
  educationUndertakingAccepted: false,
  educationFree: '',
  currentSkillLearning: '',
  currentSkill: '',
  childHobbies: [],
  technicalSkillInterest: '',
  technicalSkill: '',
  totalFamilyMembers: '',
  householdHasMonthlyIncome: '',
  childEarnsIncome: '',
  childWorkNature: '',
  assistanceApplied: '',
  assistanceAppliedWhere: '',
  careerGoal: '',
  technicalInterest: '',
  learningSkill: '',
  childMonthlyIncome: '',
  householdEarnersCount: '',
  totalHouseholdIncome: '',
  receivingOtherAid: false,
  otherAidSource: '',
  monthlyAidAmount: '',
  notAppliedElsewhereReason: '',
  guardianSignatureFileKey: '',
  termsAccepted: false,
  status: 'draft',
  siblings: [],
  relatives: [],
  householdAssetSelection: createDefaultHouseholdAssetSelection(),
  otherHouseholdAssets: [],
  documents: [],
};

function fieldLabel(field: keyof FormData) {
  const label = labels[field];
  if (!label) return field;
  return label.ur ? `${label.en} / ${label.ur}` : label.en;
}

function issuePathLabel(path?: Array<string | number>) {
  if (!path?.length) return 'Form';

  const field = [...path].reverse().find((part): part is keyof FormData => typeof part === 'string' && part in labels);
  const label = field ? fieldLabel(field) : String(path[path.length - 1]);
  const index = path.find((part): part is number => typeof part === 'number');

  return index === undefined ? label : `${label} #${index + 1}`;
}

function validationIssuesMessage(issues: Array<{ path?: Array<string | number>; message?: string }>) {
  return issues
    .map((issue) => `${issuePathLabel(issue.path)}: ${issue.message ?? 'Invalid value'}`)
    .join('\n');
}

function hasUserEnteredDraftData(data: FormData) {
  const ignoredFields = new Set<keyof FormData>([
    'collectorId',
    'collectorName',
    'collectorProject',
    'collectorCnic',
    'collectorAddress',
    'collectorContact',
    'nationality',
    'status',
    'householdAssetSelection',
    'siblings',
    'relatives',
    'otherHouseholdAssets',
    'documents',
  ]);

  return (Object.keys(data) as Array<keyof FormData>).some((field) => {
    if (ignoredFields.has(field)) return false;

    const value = data[field];
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'boolean') return value !== defaultData[field];
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
}

function hasAutosaveIdentifier(data: FormData) {
  return [
    data.childName,
    data.bFormNumber,
    data.fatherName,
    data.fatherCnic,
    data.motherName,
    data.motherCnic,
    data.guardianName,
    data.guardianCnic,
    data.fullAddress,
  ].some((value) => value.trim().length > 0);
}

interface OrphanApplicationWizardProps {
  initialData?: Partial<FormData>;
  initialDocuments?: DocumentInput[];
  initialApplicationId?: string;
}

type PersistedWizardState = {
  step?: number;
  formData?: Partial<FormData>;
  applicationId?: string | null;
  documents?: DocumentInput[];
};

const TOTAL_STEPS = 13;
const ATTESTATION_DOCUMENT_TYPE = 'attestation_confirmation';

const EDUCATION_OPTIONS = [
  { value: '', label: 'Select education' },
  { value: 'Illiterate / No Formal Education', label: 'Illiterate / No Formal Education' },
  { value: 'Primary Pass', label: 'Primary Pass' },
  { value: 'Middle Pass', label: 'Middle Pass' },
  { value: 'Matric Pass', label: 'Matric Pass' },
  { value: 'Intermediate Pass', label: 'Intermediate Pass' },
  { value: 'Diploma / Technical Education', label: 'Diploma / Technical Education' },
  { value: "Graduate (Bachelor's)", label: "Graduate (Bachelor's)" },
  { value: "Postgraduate (Master's or Above)", label: "Postgraduate (Master's or Above)" },
  { value: 'Dars-e-Nizami', label: 'Dars-e-Nizami' },
  { value: "Hifz-e-Qur'an", label: "Hifz-e-Qur'an" },
  { value: 'Other', label: 'Other' },
];

const DEATH_CAUSE_OPTIONS = [
  { value: '', label: 'Select cause of death' },
  { value: 'Natural Death (Old Age)', label: 'Natural Death (Old Age) / طبعی موت (بڑھاپا)' },
  { value: 'Heart Attack', label: 'Heart Attack / دل کا دورہ' },
  { value: 'Stroke / Brain Hemorrhage', label: 'Stroke / Brain Hemorrhage / فالج / دماغی شریان پھٹ جانا' },
  { value: 'Kidney Failure', label: 'Kidney Failure / گردوں کا فیل ہو جانا' },
  { value: 'Liver Disease', label: 'Liver Disease / جگر کی بیماری' },
  { value: 'Cancer', label: 'Cancer / کینسر' },
  { value: 'Diabetes Complications', label: 'Diabetes Complications / ذیابیطس کی پیچیدگیاں' },
  { value: 'Respiratory Disease', label: 'Respiratory Disease / سانس کی بیماری' },
  { value: 'Tuberculosis (TB)', label: 'Tuberculosis (TB) / تپ دق (ٹی بی)' },
  { value: 'Accident (General)', label: 'Accident (General) / حادثہ (عام)' },
  { value: 'Road Traffic Accident', label: 'Road Traffic Accident / سڑک حادثہ' },
  { value: 'Workplace Accident', label: 'Workplace Accident / کام کی جگہ حادثہ' },
  { value: 'Fall / Injury', label: 'Fall / Injury / گرنے یا چوٹ لگنے سے' },
  { value: 'Fire Incident', label: 'Fire Incident / آگ لگنے کا حادثہ' },
  { value: 'Drowning', label: 'Drowning / ڈوب کر' },
  { value: 'Poisoning', label: 'Poisoning / زہر خورانی' },
  { value: 'Suicide', label: 'Suicide / خودکشی' },
  { value: 'Violence / Murder', label: 'Violence / Murder / تشدد / قتل' },
  { value: 'War / Conflict', label: 'War / Conflict / جنگ / مسلح جھگڑا' },
  { value: 'Infectious Disease', label: 'Infectious Disease / متعدی بیماری' },
  { value: 'COVID-19', label: 'COVID-19 / کووڈ-19' },
  { value: 'Surgery Complications', label: 'Surgery Complications / آپریشن کی پیچیدگیاں' },
  { value: 'Pregnancy / Childbirth Complications', label: 'Pregnancy / Childbirth Complications / حمل یا زچگی کی پیچیدگیاں' },
  { value: 'Unknown', label: 'Unknown / نامعلوم' },
  { value: 'Other', label: 'Other / دیگر' },
];

const OCCUPATION_OPTIONS = [
  { value: '', label: 'Select occupation' },
  { value: 'Unemployed', label: 'Unemployed / بے روزگار' },
  { value: 'Laborer / Daily Wage Worker', label: 'Laborer / Daily Wage Worker / مزدور / دیہاڑی دار' },
  { value: 'Driver', label: 'Driver / ڈرائیور' },
  { value: 'Electrician', label: 'Electrician / الیکٹریشن' },
  { value: 'Plumber', label: 'Plumber / پلمبر' },
  { value: 'Mechanic', label: 'Mechanic / مکینک' },
  { value: 'Carpenter', label: 'Carpenter / بڑھئی' },
  { value: 'Tailor', label: 'Tailor / درزی' },
  { value: 'Shopkeeper / Businessman', label: 'Shopkeeper / Businessman / دکاندار / کاروباری شخص' },
  { value: 'Vendor / Hawker', label: 'Vendor / Hawker / ٹھیلے والا / خوانچہ فروش' },
  { value: 'Farmer', label: 'Farmer / کسان' },
  { value: 'Security Guard', label: 'Security Guard / سیکیورٹی گارڈ' },
  { value: 'Factory Worker', label: 'Factory Worker / فیکٹری ورکر' },
  { value: 'Office Employee', label: 'Office Employee / دفتری ملازم' },
  { value: 'Teacher', label: 'Teacher / استاد' },
  { value: 'Government Employee', label: 'Government Employee / سرکاری ملازم' },
  { value: 'Private Employee', label: 'Private Employee / نجی ملازم' },
  { value: 'Technician', label: 'Technician / ٹیکنیشن' },
  { value: 'Imam / Muazzin / Madrasa Staff', label: 'Imam / Muazzin / Madrasa Staff / امام / مؤذن / مدرسہ اسٹاف' },
  { value: 'Overseas Worker', label: 'Overseas Worker / بیرونِ ملک ملازمت کرنے والا' },
  { value: 'Retired', label: 'Retired / ریٹائرڈ' },
  { value: 'Disabled / Unable to Work', label: 'Disabled / Unable to Work / معذور / کام کرنے سے قاصر' },
  { value: 'Other', label: 'Other / دیگر' },
];

const FEMALE_OCCUPATION_OPTIONS = [
  { value: '', label: 'Select occupation' },
  { value: 'Housewife', label: 'Housewife / گھریلو خاتون' },
  { value: 'Unemployed', label: 'Unemployed / بے روزگار' },
  { value: 'Maid / Domestic Worker', label: 'Maid / Domestic Worker / گھریلو ملازمہ' },
  { value: 'Tailor / Stitching Work', label: 'Tailor / Stitching Work / درزی / سلائی کا کام' },
  { value: 'Beautician / Salon Work', label: 'Beautician / Salon Work / بیوٹیشن / بیوٹی پارلر کا کام' },
  { value: 'Teacher', label: 'Teacher / استاد' },
  { value: 'Madrasa Teacher', label: 'Madrasa Teacher / مدرسہ ٹیچر' },
  { value: 'Nurse / Healthcare Worker', label: 'Nurse / Healthcare Worker / نرس / طبی عملہ' },
  { value: 'Office Employee', label: 'Office Employee / دفتری ملازمہ' },
  { value: 'Factory Worker', label: 'Factory Worker / فیکٹری ورکر' },
  { value: 'Home-Based Worker', label: 'Home-Based Worker / گھریلو کام کرنے والی' },
  { value: 'Small Business / Self-Employed', label: 'Small Business / Self-Employed / چھوٹا کاروبار / ذاتی روزگار' },
  { value: 'Cook / Catering Work', label: 'Cook / Catering Work / کھانا پکانے / کیٹرنگ کا کام' },
  { value: 'Babysitter / Child Care Worker', label: 'Babysitter / Child Care Worker / بچوں کی دیکھ بھال کرنے والی' },
  { value: 'Government Employee', label: 'Government Employee / سرکاری ملازمہ' },
  { value: 'Private Employee', label: 'Private Employee / نجی ملازمہ' },
  { value: 'Widow Support / Charity Dependent', label: 'Widow Support / Charity Dependent / امداد / خیرات پر انحصار کرنے والی' },
  { value: 'Disabled / Unable to Work', label: 'Disabled / Unable to Work / معذور / کام کرنے سے قاصر' },
  { value: 'Retired', label: 'Retired / ریٹائرڈ' },
  { value: 'Other', label: 'Other / دیگر' },
];

const MOTHER_OCCUPATIONS_WITHOUT_INCOME = [
  'Housewife',
  'Unemployed',
  'Widow Support / Charity Dependent',
  'Disabled / Unable to Work',
  'Retired',
];

function motherOccupationNeedsIncome(occupation: string) {
  return Boolean(occupation) && !MOTHER_OCCUPATIONS_WITHOUT_INCOME.some((value) => occupation === value || occupation.startsWith(value));
}

const NATIVE_AREA_OPTIONS = [
  { value: '', label: 'Select native area' },
  { value: 'Karachi', label: 'Karachi / کراچی' },
  { value: 'Lahore', label: 'Lahore / لاہور' },
  { value: 'Faisalabad', label: 'Faisalabad / فیصل آباد' },
  { value: 'Rawalpindi', label: 'Rawalpindi / راولپنڈی' },
  { value: 'Islamabad', label: 'Islamabad / اسلام آباد' },
  { value: 'Multan', label: 'Multan / ملتان' },
  { value: 'Hyderabad', label: 'Hyderabad / حیدرآباد' },
  { value: 'Peshawar', label: 'Peshawar / پشاور' },
  { value: 'Quetta', label: 'Quetta / کوئٹہ' },
  { value: 'Gujranwala', label: 'Gujranwala / گوجرانوالہ' },
  { value: 'Sialkot', label: 'Sialkot / سیالکوٹ' },
  { value: 'Sukkur', label: 'Sukkur / سکھر' },
  { value: 'Bahawalpur', label: 'Bahawalpur / بہاولپور' },
  { value: 'Abbottabad', label: 'Abbottabad / ایبٹ آباد' },
  { value: 'Mardan', label: 'Mardan / مردان' },
  { value: 'Larkana', label: 'Larkana / لاڑکانہ' },
  { value: 'Other', label: 'Other / دیگر' },
];

const MOTHER_TONGUE_OPTIONS = [
  { value: '', label: 'Select mother tongue' },
  { value: 'Urdu', label: 'Urdu / اردو' },
  { value: 'Punjabi', label: 'Punjabi / پنجابی' },
  { value: 'Sindhi', label: 'Sindhi / سندھی' },
  { value: 'Pashto', label: 'Pashto / پشتو' },
  { value: 'Balochi', label: 'Balochi / بلوچی' },
  { value: 'Saraiki', label: 'Saraiki / سرائیکی' },
  { value: 'Hindko', label: 'Hindko / ہندکو' },
  { value: 'Kashmiri', label: 'Kashmiri / کشمیری' },
  { value: 'Brahui', label: 'Brahui / براہوی' },
  { value: 'Shina', label: 'Shina / شینا' },
  { value: 'Balti', label: 'Balti / بلتی' },
  { value: 'Wakhi', label: 'Wakhi / وخی' },
  { value: 'English', label: 'English / انگریزی' },
  { value: 'Other', label: 'Other / دیگر' },
];

const GUARDIAN_RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Select relationship' },
  { value: 'Paternal Grandfather', label: 'Paternal Grandfather / دادا' },
  { value: 'Paternal Grandmother', label: 'Paternal Grandmother / دادی' },
  { value: 'Maternal Grandfather', label: 'Maternal Grandfather / نانا' },
  { value: 'Maternal Grandmother', label: 'Maternal Grandmother / نانی' },
  { value: 'Uncle (Paternal)', label: 'Uncle (Paternal) / چچا' },
  { value: 'Uncle (Maternal)', label: 'Uncle (Maternal) / ماموں' },
  { value: 'Aunt (Paternal)', label: 'Aunt (Paternal) / پھوپھی' },
  { value: 'Aunt (Maternal)', label: 'Aunt (Maternal) / خالہ' },
  { value: 'Elder Brother', label: 'Elder Brother / بڑا بھائی' },
  { value: 'Elder Sister', label: 'Elder Sister / بڑی بہن' },
  { value: 'Cousin', label: 'Cousin / کزن' },
  { value: 'Step-Parent', label: 'Step-Parent / سوتیلا والد/والدہ' },
  { value: 'Legal Guardian (Court/Appointed)', label: 'Legal Guardian (Court/Appointed) / قانونی سرپرست' },
  { value: 'Family Friend', label: 'Family Friend / خاندانی دوست' },
  { value: 'Neighbour', label: 'Neighbour / پڑوسی' },
  { value: 'Teacher / Madrasa Caretaker', label: 'Teacher / Madrasa Caretaker / استاد / مدرسہ نگران' },
  { value: 'Other Relative', label: 'Other Relative / دیگر رشتہ دار' },
  { value: 'Non-Relative Guardian', label: 'Non-Relative Guardian / غیر رشتہ دار سرپرست' },
  { value: 'Other', label: 'Other / دیگر' },
];

const MOTHER_SEPARATION_REASON_OPTIONS = [
  { value: '', label: 'Select separation reason' },
  { value: 'Financial Hardship', label: 'Financial Hardship / مالی مشکلات' },
  { value: 'Mother Working in Another City', label: 'Mother Working in Another City / والدہ کا دوسرے شہر میں روزگار' },
  { value: 'Mother Working Abroad', label: 'Mother Working Abroad / والدہ کا بیرونِ ملک روزگار' },
  { value: 'Children Living with Paternal Relatives', label: 'Children Living with Paternal Relatives / بچے دادا/دادی یا چچا کے ساتھ رہ رہے ہیں' },
  { value: 'Children Living with Maternal Relatives', label: 'Children Living with Maternal Relatives / بچے نانا/نانی یا ماموں کے ساتھ رہ رہے ہیں' },
  { value: 'Temporary Arrangement', label: 'Temporary Arrangement / عارضی انتظام' },
  { value: 'Mother Illness', label: 'Mother Illness / والدہ کی بیماری' },
  { value: 'Mother Remarried', label: 'Mother Remarried / والدہ کی دوسری شادی' },
  { value: 'Legal Custody Decision', label: 'Legal Custody Decision / قانونی حضانت کا فیصلہ' },
  { value: 'Family Dispute', label: 'Family Dispute / خاندانی اختلاف / جھگڑا' },
  { value: 'Social Pressure / Cultural Reasons', label: 'Social Pressure / Cultural Reasons / سماجی یا ثقافتی وجوہات' },
  { value: 'Mother Unable to Provide Care', label: 'Mother Unable to Provide Care / والدہ بچوں کی دیکھ بھال سے قاصر' },
  { value: 'Unknown', label: 'Unknown / نامعلوم' },
  { value: 'Other', label: 'Other / دیگر' },
];

const MONTHLY_INCOME_OPTIONS = [
  { value: '', label: 'Select monthly income' },
  { value: '4999', label: 'Less than 5,000 PKR' },
  { value: '8000', label: '5,000 - 8,000 PKR' },
  { value: '12000', label: '8,001 - 12,000 PKR' },
  { value: '18000', label: '12,001 - 18,000 PKR' },
  { value: '25000', label: '18,001 - 25,000 PKR' },
  { value: '35000', label: '25,001 - 35,000 PKR' },
  { value: '45000', label: '35,001 - 45,000 PKR' },
  { value: '60000', label: '45,001 - 60,000 PKR' },
  { value: '60001', label: 'Above 60,000 PKR' },
];

const RELATIVE_SUPPORT_OPTIONS = [
  { value: '', label: 'Select nature of support' },
  { value: 'financial_support', label: 'Financial Support / مالی معاونت' },
  { value: 'educational_support', label: 'Educational Support / تعلیمی معاونت' },
  { value: 'residence_shelter', label: 'Residence / Shelter / رہائش فراہم کرنا' },
  { value: 'food_support', label: 'Food Support / خوراک فراہم کرنا' },
  { value: 'medical_support', label: 'Medical Support / طبی معاونت' },
  { value: 'guardianship_caretaking', label: 'Guardianship / Caretaking / سرپرستی / دیکھ بھال' },
  { value: 'occasional_support', label: 'Occasional Support / وقتی معاونت' },
  { value: 'no_support', label: 'No Support / کوئی معاونت نہیں' },
  { value: 'other', label: 'Other / دیگر' },
];

const RELATIVE_TYPE_OPTIONS = [
  { value: 'paternal_grandfather', label: 'Paternal Grandfather / دادا' },
  { value: 'maternal_grandfather', label: 'Maternal Grandfather / نانا' },
  { value: 'paternal_uncle', label: 'Paternal Uncle / چچا' },
  { value: 'maternal_uncle', label: 'Maternal Uncle / ماموں' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male / لڑکا' },
  { value: 'female', label: 'Female / لڑکی' },
];

const RELIGION_OPTIONS = [
  { value: '', label: 'Select religion' },
  { value: 'Islam', label: 'Islam / اسلام' },
  { value: 'Christianity', label: 'Christianity / عیسائیت' },
  { value: 'Hinduism', label: 'Hinduism / ہندومت' },
  { value: 'Other', label: 'Other / دیگر' },
];

const SYED_STATUS_OPTIONS = [
  { value: '', label: 'Select Syed status' },
  { value: 'Syed', label: 'Syed / سید' },
  { value: 'Non-Syed', label: 'Non-Syed / غیر سید' },
];

const NATIONALITY_OPTIONS = [
  { value: 'Pakistani', label: 'Pakistani / پاکستانی' },
  { value: 'Afghan', label: 'Afghan / افغانی' },
  { value: 'Bangladeshi', label: 'Bangladeshi / بنگلہ دیشی' },
  { value: 'Indian', label: 'Indian / بھارتی' },
  { value: 'Stateless', label: 'Stateless / بے وطن' },
  { value: 'Refugee', label: 'Refugee / مہاجر / پناہ گزین' },
  { value: 'Other', label: 'Other / دیگر' },
];

const SIBLING_RELATION_OPTIONS = [
  { value: 'brother', label: 'Brother / بھائی' },
  { value: 'sister', label: 'Sister / بہن' },
];

const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Select marital status' },
  { value: 'married', label: 'Married / شادی شدہ' },
  { value: 'unmarried', label: 'Unmarried / غیر شادی شدہ' },
  { value: 'widowed', label: 'Widowed / بیوہ' },
  { value: 'divorced', label: 'Divorced / طلاق یافتہ' },
];

const HEALTH_STATUS_OPTIONS = [
  { value: '', label: 'Select health status' },
  { value: 'healthy', label: 'Healthy / صحتمند' },
  { value: 'chronic_illness', label: 'Chronic illness / موذی بیماری' },
  { value: 'disabled', label: 'Disabled / معذور' },
];
const DISABILITY_TYPE_OPTIONS = [
  { value: '', label: 'Select disability type' },
  { value: 'physical', label: 'Physical Disability / جسمانی معذوری' },
  { value: 'visual', label: 'Visual Impairment / بینائی سے محرومی' },
  { value: 'hearing', label: 'Hearing Impairment / سماعت سے محرومی' },
  { value: 'speech', label: 'Speech Impairment / گویائی کی معذوری' },
  { value: 'intellectual', label: 'Intellectual Disability / ذہنی معذوری' },
  { value: 'multiple', label: 'Multiple Disabilities / ایک سے زائد معذوریاں' },
  { value: 'other', label: 'Other / دیگر' },
];
const DISABILITY_CAUSE_OPTIONS = [
  { value: '', label: 'Select cause' },
  { value: 'birth', label: 'By Birth / پیدائشی' },
  { value: 'accident', label: 'Due to Accident / حادثے کی وجہ سے' },
  { value: 'illness', label: 'Due to Illness / بیماری کی وجہ سے' },
  { value: 'unknown', label: 'Unknown / نامعلوم' },
  { value: 'other', label: 'Other / دیگر' },
];
const DISEASE_OPTIONS = [
  { value: '', label: 'Select disease / condition' },
  { value: 'frequent_fever', label: 'Fever / Frequent Fever / بخار / بار بار بخار' },
  { value: 'asthma', label: 'Asthma / دمہ' },
  { value: 'heart_disease', label: 'Heart Disease / دل کی بیماری' },
  { value: 'diabetes', label: 'Diabetes / ذیابیطس' },
  { value: 'kidney_disease', label: 'Kidney Disease / گردے کی بیماری' },
  { value: 'liver_disease', label: 'Liver Disease / جگر کی بیماری' },
  { value: 'hepatitis', label: 'Hepatitis / ہیپاٹائٹس' },
  { value: 'tb', label: 'Tuberculosis (TB) / تپ دق (ٹی بی)' },
  { value: 'cancer', label: 'Cancer / کینسر' },
  { value: 'epilepsy', label: 'Epilepsy / Seizures / مرگی' },
  { value: 'blood_disorder', label: 'Blood Disorder / خون کی بیماری' },
  { value: 'thalassemia', label: 'Thalassemia / تھیلیسیمیا' },
  { value: 'polio', label: 'Polio / پولیو' },
  { value: 'malnutrition', label: 'Physical Weakness / Malnutrition / کمزوری / غذائی قلت' },
  { value: 'mental_illness', label: 'Mental Illness / ذہنی بیماری' },
  { value: 'depression', label: 'Depression / Psychological Issue / ذہنی دباؤ / نفسیاتی مسئلہ' },
  { value: 'vision_problem', label: 'Vision Problem / بینائی کا مسئلہ' },
  { value: 'hearing_problem', label: 'Hearing Problem / سماعت کا مسئلہ' },
  { value: 'skin_disease', label: 'Skin Disease / جلد کی بیماری' },
  { value: 'disability_related', label: 'Disability Related Illness / معذوری سے متعلق بیماری' },
  { value: 'chronic_illness', label: 'Chronic Illness / دائمی بیماری' },
  { value: 'other', label: 'Other / دیگر' },
];
const CLASS_OPTIONS = [
  { value: '', label: 'Select class' }, 'Preschool','Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9 / O level I','Class 10 / O level II','Intermediate / A level',
].map((item) => typeof item === 'string' ? { value: item, label: item } : item);
const STUDYING_SINCE_YEAR_OPTIONS = [
  { value: '', label: 'Select year' },
  ...Array.from({ length: 31 }, (_, index) => {
    const year = new Date().getFullYear() - index;
    return { value: `${year}-01-01`, label: String(year) };
  }),
];
const TRANSPORT_OPTIONS = [
  { value: '', label: 'Select transport' },
  { value: 'walking', label: 'Walking / پیدل' }, { value: 'bicycle', label: 'Bicycle / سائیکل' }, { value: 'motorcycle', label: 'Motorcycle / موٹر سائیکل' }, { value: 'van_bus', label: 'School Van / Bus / اسکول وین / بس' }, { value: 'public_transport', label: 'Public Transport / پبلک ٹرانسپورٹ' }, { value: 'rickshaw', label: 'Rickshaw / رکشہ' }, { value: 'other', label: 'Other / دیگر' },
];
const ISLAMIC_STUDIES_OPTIONS = [
  { value: '', label: 'Select level' }, { value: 'nazra', label: 'Nazra Quran / ناظرہ قرآن' }, { value: 'hifz', label: 'Hifz Quran / حفظ قرآن' }, { value: 'tajweed', label: 'Tajweed / تجوید' }, { value: 'basic', label: 'Basic Islamic Studies / بنیادی دینی تعلیم' }, { value: 'dars_e_nizami', label: 'Dars-e-Nizami / درس نظامی' }, { value: 'other', label: 'Other / دیگر' },
];
const SKILL_OPTIONS = [
  { value: '', label: 'Select skill' }, { value: 'tailoring', label: 'Tailoring / سلائی' }, { value: 'mobile_repair', label: 'Mobile Repairing / موبائل ریپئرنگ' }, { value: 'computer', label: 'Computer Skills / کمپیوٹر مہارت' }, { value: 'graphic_design', label: 'Graphic Designing / گرافک ڈیزائننگ' }, { value: 'electric', label: 'Electric Work / الیکٹریشن کا کام' }, { value: 'mechanical', label: 'Mechanical Work / مکینک کا کام' }, { value: 'carpentry', label: 'Carpentry / بڑھئی کا کام' }, { value: 'cooking', label: 'Cooking / کھانا پکانا' }, { value: 'driving', label: 'Driving / ڈرائیونگ' }, { value: 'beautician', label: 'Beautician Work / بیوٹیشن کا کام' }, { value: 'handicrafts', label: 'Handicrafts / دستکاری' }, { value: 'quran_teaching', label: 'Quran Teaching / قرآن پڑھانا' }, { value: 'other', label: 'Other / دیگر' },
];
const HOBBY_OPTIONS = [
  { value: 'football', label: 'Football / فٹبال' }, { value: 'cricket', label: 'Cricket / کرکٹ' }, { value: 'reading', label: 'Reading / مطالعہ' }, { value: 'drawing', label: 'Drawing / ڈرائنگ' }, { value: 'writing', label: 'Writing / لکھنا' }, { value: 'recitation_naat', label: 'Recitation / Naat / تلاوت / نعت' }, { value: 'sports', label: 'Sports / کھیل کود' }, { value: 'technology', label: 'Computer / Technology / کمپیوٹر / ٹیکنالوجی' }, { value: 'arts_crafts', label: 'Arts & Crafts / آرٹ اور دستکاری' }, { value: 'gardening', label: 'Gardening / باغبانی' }, { value: 'cooking', label: 'Cooking / کھانا پکانا' }, { value: 'sewing', label: 'Sewing / Stitching / سلائی' }, { value: 'public_speaking', label: 'Public Speaking / تقریر' }, { value: 'islamic_studies', label: 'Islamic Studies / دینی تعلیم' }, { value: 'other', label: 'Other / دیگر' },
];
const CHILD_WORK_OPTIONS = [
  { value: '', label: 'Select work' }, { value: 'shop', label: 'Shop Work / دکان کا کام' }, { value: 'labor', label: 'Labor Work / مزدوری' }, { value: 'workshop', label: 'Workshop / Mechanical Work / ورکشاپ / مکینک کا کام' }, { value: 'domestic', label: 'Domestic Work / گھریلو کام' }, { value: 'vending', label: 'Street Vending / ٹھیلا / خوانچہ فروشی' }, { value: 'agriculture', label: 'Agriculture Work / زرعی کام' }, { value: 'tailoring', label: 'Tailoring / سلائی' }, { value: 'quran', label: 'Teaching Quran / قرآن پڑھانا' }, { value: 'online', label: 'Online Work / آن لائن کام' }, { value: 'part_time', label: 'Part-Time Work / جز وقتی کام' }, { value: 'other', label: 'Other / دیگر' },
];
const ASSISTANCE_SOURCE_OPTIONS = [
  { value: '', label: 'Select source' }, { value: 'relative', label: 'Relative Support / رشتہ داروں کی امداد' }, { value: 'ngo', label: 'NGO / Welfare Organization / فلاحی ادارہ' }, { value: 'government', label: 'Government Support / سرکاری امداد' }, { value: 'mosque_madrasa', label: 'Mosque / Madrasa Support / مسجد / مدرسہ امداد' }, { value: 'zakat', label: 'Zakat / زکوٰۃ' }, { value: 'sponsorship', label: 'Sponsorship Program / کفالت پروگرام' }, { value: 'community', label: 'Neighbours / Community / پڑوسی / محلہ' }, { value: 'other', label: 'Other / دیگر' },
];

function formatCnic(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function formatBForm(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 15);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function calculateAgeFromDate(dateValue: string, asOfValue?: string) {
  if (!dateValue) return '';

  const date = new Date(dateValue);
  const asOfDate = asOfValue ? new Date(asOfValue) : new Date();
  if (Number.isNaN(date.getTime()) || Number.isNaN(asOfDate.getTime()) || date > asOfDate) return '';

  let age = asOfDate.getFullYear() - date.getFullYear();
  const hasBirthdayPassed =
    asOfDate.getMonth() > date.getMonth() ||
    (asOfDate.getMonth() === date.getMonth() && asOfDate.getDate() >= date.getDate());

  if (!hasBirthdayPassed) age -= 1;
  return age >= 0 ? String(age) : '';
}

function normalizeAddressOption(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function hasOption(options: string[], value: string) {
  const normalizedValue = normalizeAddressOption(value).toLowerCase();
  return options.some((option) => normalizeAddressOption(option).toLowerCase() === normalizedValue);
}

function normalizeInitialData(data: FormData): FormData {
  const next = { ...data };
  // Normalize legacy 'sick' healthStatus from old drafts to 'chronic_illness'
  if (next.healthStatus === 'sick') {
    next.healthStatus = 'chronic_illness';
  }
  next.collectorCnic = formatCnic(next.collectorCnic);
  next.fatherCnic = formatCnic(next.fatherCnic);
  next.motherCnic = formatCnic(next.motherCnic);
  next.guardianCnic = formatCnic(next.guardianCnic);
  next.bFormNumber = formatBForm(next.bFormNumber);
  next.motherEmploymentStatus = '';
  next.motherIsHousewife = false;

  if (!next.motherAlive) {
    if (next.motherDeathDate || next.motherDeathCause) {
      next.motherAlive = 'no';
    } else if (next.motherContact || next.motherOccupation || next.motherMonthlyIncome || next.motherRemarried) {
      next.motherAlive = 'yes';
    }
  }

  if (!next.motherIsGuardian && next.motherAlive === 'yes') {
    next.motherIsGuardian = next.guardianName || next.guardianContact ? 'no' : 'yes';
  }

  if ((next.motherAlive === 'yes' || next.motherAlive === 'separated') && next.motherDob && !next.motherAge) {
    next.motherAge = calculateAgeFromDate(next.motherDob);
  }

  if (next.motherAlive === 'no' && next.motherDob && next.motherDeathDate && !next.motherAge) {
    next.motherAge = calculateAgeFromDate(next.motherDob, next.motherDeathDate);
  }

  next.householdAssetSelection = mergeHouseholdAssetSelection(next.householdAssetSelection);

  return next;
}

export default function OrphanApplicationWizard({ initialData, initialDocuments, initialApplicationId }: OrphanApplicationWizardProps) {
  const router = useRouter();
  const { startLoading } = useNavigationLoading();
  const wizardRef = useRef<HTMLDivElement>(null);
  const mergedData = useMemo(() => normalizeInitialData({ ...defaultData, ...initialData }), [initialData]);
  const storageKey = useMemo(() => {
    const collectorKey = mergedData.collectorId || mergedData.collectorCnic || 'unknown';
    return `saiban-orphan-application:new:${collectorKey}`;
  }, [mergedData.collectorCnic, mergedData.collectorId]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(mergedData);
  const [message, setMessage] = useState<string | null>(null);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'draft' | 'submitted' | null>(null);
  const [showSubmissionSuccessModal, setShowSubmissionSuccessModal] = useState(false);
  const [submissionDoneLoading, setSubmissionDoneLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(initialApplicationId ?? null);
  const [documents, setDocuments] = useState<DocumentInput[]>(initialDocuments ?? []);
  const [addressOptions, setAddressOptions] = useState<AddressOptionInput[]>([]);
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(Boolean(initialApplicationId));
  const [shouldPersistNewApplication, setShouldPersistNewApplication] = useState(!initialApplicationId);
  const [autosaveStatus, setAutosaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutosavedPayloadRef = useRef<string | null>(null);
  const latestApplicationIdRef = useRef<string | null>(initialApplicationId ?? null);
  const isSubmitting = submittingAction !== null;

  useEffect(() => {
    latestApplicationIdRef.current = applicationId;
  }, [applicationId]);

  useEffect(() => {
    if (initialApplicationId) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setHasLoadedPersistedState(true);
        return;
      }

      const persisted = JSON.parse(raw) as PersistedWizardState;
      const persistedFormData = persisted.formData ?? {};

      if (persisted.applicationId) {
        window.localStorage.removeItem(storageKey);
        setHasLoadedPersistedState(true);
        return;
      }

      if (Array.isArray((persistedFormData as { householdAssets?: unknown }).householdAssets)) {
        const rawAssets = (persistedFormData as { householdAssets: { assetType: string; quantity?: string; value?: string }[] }).householdAssets;
        (persistedFormData as Partial<FormData>).householdAssetSelection = householdAssetRowsToSelection(
          rawAssets.map((a) => ({
            assetType: a.assetType,
            quantity: a.quantity === '' || a.quantity === undefined ? undefined : Number(a.quantity),
            value: a.value === '' || a.value === undefined ? undefined : Number(a.value),
          })),
        );
        delete (persistedFormData as { householdAssets?: unknown }).householdAssets;
      }

      if (persistedFormData.status === 'submitted') {
        window.localStorage.removeItem(storageKey);
        setHasLoadedPersistedState(true);
        return;
      }

      setFormData(normalizeInitialData({
        ...defaultData,
        ...mergedData,
        ...persistedFormData,
        collectorId: mergedData.collectorId,
        collectorName: mergedData.collectorName,
        collectorProject: mergedData.collectorProject,
        collectorCnic: mergedData.collectorCnic,
        collectorAddress: mergedData.collectorAddress,
        collectorContact: mergedData.collectorContact,
      }));
      setStep(Math.min(Math.max(Number(persisted.step) || 1, 1), TOTAL_STEPS));
      setApplicationId(persisted.applicationId ?? null);
      setDocuments(Array.isArray(persisted.documents) ? persisted.documents : []);
      setHasLoadedPersistedState(true);
    } catch (error) {
      window.localStorage.removeItem(storageKey);
      setHasLoadedPersistedState(true);
    }
  }, [initialApplicationId, mergedData, storageKey]);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/address-options')
      .then((response) => (response.ok ? response.json() : []))
      .then((options) => {
        if (isMounted && Array.isArray(options)) {
          setAddressOptions(options);
        }
      })
      .catch(() => {
        if (isMounted) setAddressOptions([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialApplicationId || !shouldPersistNewApplication || !hasLoadedPersistedState) return;

    const persisted: PersistedWizardState & { updatedAt: string } = {
      step,
      formData,
      applicationId,
      documents,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(storageKey, JSON.stringify(persisted));
  }, [applicationId, documents, formData, hasLoadedPersistedState, initialApplicationId, shouldPersistNewApplication, step, storageKey]);

  const updateField = (field: keyof FormData, value: FormData[keyof FormData]) => {
    const nextValue =
      typeof value === 'string' && field.toLowerCase().includes('cnic')
        ? formatCnic(value)
        : field === 'bFormNumber' && typeof value === 'string'
          ? formatBForm(value)
          : value;
    setFormData((current) => ({ ...current, [field]: nextValue }));
  };

  const clearFields = (fields: Array<keyof FormData>) => {
    setFormData((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        (next as any)[field] = defaultData[field];
      });
      return next;
    });
  };

  const updateFields = (values: Partial<FormData>) => {
    setFormData((current) => ({ ...current, ...values }));
  };

  const saveAddressOption = async (type: 'district' | 'tehsil', name: string) => {
    const normalizedName = normalizeAddressOption(name);
    if (!normalizedName || !formData.province) return;
    if (normalizedName.toLowerCase() === 'unknown') return;
    if (type === 'tehsil' && !formData.district) return;

    const exists = addressOptions.some((option) =>
      option.type === type &&
      option.province === formData.province &&
      (type === 'district' || option.district === formData.district) &&
      normalizeAddressOption(option.name).toLowerCase() === normalizedName.toLowerCase(),
    );

    if (exists) return;

    const response = await fetch('/api/address-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        province: formData.province,
        district: type === 'tehsil' ? formData.district : null,
        name: normalizedName,
      }),
    });

    if (!response.ok) return;

    const option = await response.json();
    setAddressOptions((current) => {
      const alreadyExists = current.some((item) => item.id === option.id);
      return alreadyExists ? current : [...current, option];
    });
  };

  const commitDistrict = (value: string) => {
    const normalizedValue = normalizeAddressOption(value);
    updateFields({ district: normalizedValue, tehsil: '' });
    void saveAddressOption('district', normalizedValue);
  };

  const commitTehsil = (value: string) => {
    const normalizedValue = normalizeAddressOption(value);
    updateField('tehsil', normalizedValue);
    void saveAddressOption('tehsil', normalizedValue);
  };

  const handleMotherAliveChange = (value: string) => {
    updateFields({
      motherAlive: value,
      ...(value === 'no' && formData.motherDob && formData.motherDeathDate
        ? { motherAge: calculateAgeFromDate(formData.motherDob, formData.motherDeathDate) }
        : (value === 'yes' || value === 'separated') && formData.motherDob
          ? { motherAge: calculateAgeFromDate(formData.motherDob) }
          : {}),
      ...(value === 'no'
        ? {
            motherContact: '',
            motherSeparationReason: '',
            motherIsHousewife: false,
            motherEmploymentStatus: '',
            motherOccupation: '',
            motherMonthlyIncome: '',
            motherRemarried: false,
            motherIsGuardian: 'no',
          }
        : {
            motherDeathDate: '',
            motherDeathCause: '',
            ...(value === 'separated'
              ? { motherIsGuardian: 'no', motherContact: '', motherOccupation: '', motherMonthlyIncome: '' }
              : { motherSeparationReason: '' }),
          }),
    });
  };

  const handleMotherDobChange = (value: string) => {
    updateFields({
      motherDob: value,
      ...(formData.motherAlive === 'no' && formData.motherDeathDate
        ? { motherAge: calculateAgeFromDate(value, formData.motherDeathDate) }
        : motherIsLiving
          ? { motherAge: calculateAgeFromDate(value) }
          : {}),
    });
  };

  const handleMotherDeathDateChange = (value: string) => {
    updateFields({
      motherDeathDate: value,
      ...(formData.motherDob ? { motherAge: calculateAgeFromDate(formData.motherDob, value) } : {}),
    });
  };

  const handleMotherIsGuardianChange = (value: string) => {
    updateFields({
      motherIsGuardian: value,
      ...(value === 'yes'
        ? {
            guardianName: '',
            guardianRelationship: '',
            guardianGender: '',
            guardianCnic: '',
            guardianEducation: '',
            guardianMotherTongue: '',
            guardianNativeArea: '',
            guardianContact: '',
            guardianZakatStatus: '',
            guardianOccupation: '',
            guardianFamilyHolder: '',
            guardianFamilyHolderAmount: '',
            guardianFamilyMembersCount: '',
            guardianMonthlyIncome: '',
            guardianSignatureFileKey: '',
          }
        : {}),
    });
  };

  const handleGuardianFamilyHolderChange = (value: string) => {
    updateFields({
      guardianFamilyHolder: value,
      guardianFamilyHolderAmount: '',
      ...(value === 'yes' ? {} : { guardianFamilyMembersCount: '' }),
    });
  };

  const handleGuardianGenderChange = (value: string) => {
    updateFields({
      guardianGender: value,
      guardianOccupation: '',
    });
  };

  const handleRelativeDisclosureChange = (value: string) => {
    updateFields({
      relativeInformationDisclosed: value,
      ...(value === 'yes' ? {} : { relatives: [] }),
    });
    if (value === 'no') {
      setStep(5);
    }
  };

  const handleMotherOccupationChange = (value: string) => {
    updateFields({
      motherOccupation: value,
      ...(motherOccupationNeedsIncome(value) ? {} : { motherMonthlyIncome: '' }),
    });
  };

  const addOtherHouseholdAsset = () => {
    updateField('otherHouseholdAssets', [...formData.otherHouseholdAssets, { item: '', value: '' }]);
  };

  const updateOtherHouseholdAsset = (index: number, patch: Partial<OtherHouseholdAssetInput>) => {
    updateField(
      'otherHouseholdAssets',
      formData.otherHouseholdAssets.map((asset, assetIndex) => (assetIndex === index ? { ...asset, ...patch } : asset)),
    );
  };

  const removeOtherHouseholdAsset = (index: number) => {
    updateField('otherHouseholdAssets', formData.otherHouseholdAssets.filter((_, assetIndex) => assetIndex !== index));
  };

  const handleHouseOwnershipStatusChange = (value: string) => {
    updateFields({
      houseOwnershipStatus: value,
      houseOwner: '',
      ...(value === 'rent' ? {} : { monthlyRent: '', rentPaidBy: '' }),
    });
  };

  const handleProvinceChange = (value: string) => {
    updateFields({
      province: value,
      district: '',
      tehsil: '',
    });
  };

  const handleCaptureGps = () => {
    setGpsMessage(null);
    setGpsWarning(null);

    if (!navigator.geolocation) {
      setGpsWarning('GPS حاصل نہیں ہو سکا۔ براہ کرم پتہ دستی طور پر منتخب کریں۔ GPS not captured. Please select address manually.');
      return;
    }

    setIsCapturingGps(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = String(position.coords.latitude);
        const longitude = String(position.coords.longitude);
        const gpsAccuracyMeters = Number.isFinite(position.coords.accuracy) ? String(position.coords.accuracy) : '';
        const gpsCapturedAt = new Date().toISOString();

        updateFields({
          latitude,
          longitude,
          gpsAccuracyMeters,
          gpsCapturedAt,
        });
        setGpsMessage('GPS location captured successfully.');
        setIsCapturingGps(false);
      },
      () => {
        setIsCapturingGps(false);
        setGpsWarning('GPS حاصل نہیں ہو سکا۔ براہ کرم پتہ دستی طور پر منتخب کریں۔ GPS not captured. Please select address manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const handleHealthStatusChange = (value: string) => {
    updateFields({
      healthStatus: value,
      ...(value === 'healthy' ? {
        disabilityDetails: '', disabilityType: '', disabilityCause: '', disabilityCauseDetails: '', disabilitySince: '', treatmentOngoing: '', chronicDisease: '', specifyDisease: '', illnessSince: '', treatmentPlace: '', monthlyMedicalExpenses: '',
      } : value === 'chronic_illness' ? {
        disabilityDetails: '', disabilityType: '', disabilityCause: '', disabilityCauseDetails: '', disabilitySince: '', treatmentOngoing: '',
      } : value === 'disabled' ? {
        chronicDisease: '', specifyDisease: '', illnessSince: '',
      } : {}),
    });
  };

  const handleTreatmentOngoingChange = (value: string) => {
    updateFields({
      treatmentOngoing: value,
      ...(value === 'yes' ? {} : { treatmentPlace: '', monthlyMedicalExpenses: '' }),
    });
  };

  const handleSchoolEnrollmentChange = (value: boolean) => {
    updateFields({
      currentlyStudying: value,
      ...(value ? {} : { currentClass: '', schoolName: '', schoolAddress: '', schoolDistanceKm: '', schoolTransportMode: '', schoolStudyingSince: '' }),
    });
  };

  const handleEducationFreeChange = (value: string) => {
    updateFields({ educationFree: value, ...(value === 'yes' ? { monthlySchoolFee: '' } : {}) });
  };

  const handleHouseholdIncomeChange = (value: string) => {
    updateFields({
      householdHasMonthlyIncome: value,
      ...(value === 'yes' ? {} : { householdEarnersCount: '', totalHouseholdIncome: '', childEarnsIncome: '', childWorkNature: '', childMonthlyIncome: '' }),
    });
  };

  const handleChildEarnsIncomeChange = (value: string) => {
    updateFields({ childEarnsIncome: value, ...(value === 'yes' ? {} : { childWorkNature: '', childMonthlyIncome: '' }) });
  };

  const handleEducationFeeStatusChange = (value: string) => {
    updateFields({
      educationFeeStatus: value,
      ...(value === 'paid' ? {} : { monthlySchoolFee: '' }),
    });
  };

  const handleMadrasaChange = (value: boolean) => {
    updateFields({
      enrolledInMadrasa: value,
      ...(value ? {} : { madrasaName: '', madrasaEducationDetails: '' }),
    });
  };

  const handleOtherAidChange = (value: boolean) => {
    updateFields({
      receivingOtherAid: value,
      ...(value ? {} : { otherAidSource: '', monthlyAidAmount: '' }),
    });
  };

  const handleNationalityChange = (value: string) => {
    updateFields({
      nationality: value,
      ...(value === 'Other' ? {} : { specifyNationality: '' }),
    });
  };

  const handleReligionChange = (value: string) => {
    updateFields({
      religion: value,
      ...(value === 'Other' ? {} : { specifyReligion: '' }),
    });
  };

  const handleTotalSiblingsChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const count = Math.max(0, Number(digits || 0));
    setFormData((current) => {
      const siblings = Array.from({ length: count }, (_, index) => current.siblings[index] ?? {
        name: '',
        relation: 'brother',
        dob: '',
        age: '',
        educationStatus: '',
        currentlyStudying: '',
        occupation: '',
        monthlyIncomeOrFee: '',
        maritalStatus: '',
      });

      return {
        ...current,
        totalSiblings: digits,
        siblings,
      };
    });
  };

  const handleSiblingDobChange = (index: number, value: string) => {
    updateArrayItem<SiblingInput>('siblings', index, {
      dob: value,
      age: calculateAgeFromDate(value),
    });
  };

  const handleChildDobChange = (value: string) => {
    updateFields({ dateOfBirth: value, age: calculateAgeFromDate(value) });
  };

  const orphanAge = formData.age === '' ? undefined : Number(formData.age);
  const orphanAgeError =
    orphanAge !== undefined && !Number.isNaN(orphanAge) && orphanAge >= 12
      ? 'Orphan age must be less than 12 years. / یتیم بچے کی عمر 12 سال سے کم ہونی چاہیے۔'
      : '';

  const toggleMultiSelectValue = (field: 'childHobbies', value: string) => {
    setFormData((current) => {
      const currentValues = current[field];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...current, [field]: nextValues };
    });
  };

  const handleHouseholdAssetHasChange = (key: HouseholdAssetKey, has: boolean) => {
    setFormData((current) => ({
      ...current,
      householdAssetSelection: {
        ...current.householdAssetSelection,
        [key]: has
          ? { ...current.householdAssetSelection[key], has: true, answered: true }
          : { has: false, answered: true, value: '', grams: '' },
      },
    }));
  };

  const updateHouseholdAssetEntry = (key: HouseholdAssetKey, patch: Partial<HouseholdAssetEntry>) => {
    setFormData((current) => ({
      ...current,
      householdAssetSelection: {
        ...current.householdAssetSelection,
        [key]: { ...current.householdAssetSelection[key], ...patch },
      },
    }));
  };

  const updateArrayItem = <T extends object>(
    key: 'siblings' | 'relatives',
    index: number,
    value: Partial<T>,
  ) => {
    setFormData((current) => {
      const list = [...current[key]] as any[];
      list[index] = { ...list[index], ...value };
      return { ...current, [key]: list };
    });
  };

  const addArrayItem = (key: 'siblings' | 'relatives') => {
    setFormData((current) => {
      const item = key === 'siblings'
        ? { name: '', relation: 'brother', dob: '', age: '', educationStatus: '', currentlyStudying: '', occupation: '', monthlyIncomeOrFee: '', maritalStatus: '' }
        : { relativeType: 'paternal_grandfather' as const, name: '', age: '', occupation: '', occupationOther: '', monthlyIncome: '', supportType: '', supportTypeOther: '' };
      const next = [...current[key], item];
      return { ...current, [key]: next, ...(key === 'siblings' ? { totalSiblings: String(next.length) } : {}) };
    });
  };

  const removeArrayItem = (key: 'siblings' | 'relatives', index: number) => {
    setFormData((current) => {
      const next = current[key].filter((_, idx) => idx !== index);
      return {
        ...current,
        [key]: next,
        ...(key === 'siblings' ? { totalSiblings: String(next.length) } : {}),
      };
    });
  };

  const handleDocumentUpload = (document: DocumentInput) => {
    setDocuments((current) => [
      ...current.filter((item) => item.documentType !== document.documentType),
      document,
    ]);
    setMessage('Document uploaded successfully.');
  };

  const handleDocumentRemove = async (documentId: string) => {
    try {
      await fetch(`/api/upload?documentId=${documentId}`, { method: 'DELETE' });
      setDocuments((current) => current.filter((doc) => doc.id !== documentId));
      setMessage('Document removed successfully.');
    } catch (error) {
      setMessage('Failed to remove document.');
    }
  };

  const goToStep = (nextStep: number) => {
    setStep(Math.min(Math.max(nextStep, 1), TOTAL_STEPS));
    window.requestAnimationFrame(() => {
      wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const goNext = () => goToStep(step + 1);
  const goBack = () => goToStep(step - 1);

  const buildApplicationRequestBody = (saveStatus: 'draft' | 'submitted') => {
    const { householdAssetSelection, otherHouseholdAssets, ...formFields } = formData;
    const relativeInformationDisclosed = formFields.relativeInformationDisclosed === 'yes';
    const totalBrothers = formFields.siblings.filter((sibling) => sibling.relation === 'brother').length;
    const totalSisters = formFields.siblings.filter((sibling) => sibling.relation === 'sister').length;
    const siblingsUnder12 = formFields.siblings.filter((sibling) => sibling.age !== '' && Number(sibling.age) < 12).length;
    const registeredBrothers = formFields.siblings.filter((sibling) => sibling.relation === 'brother' && sibling.currentlyStudying === 'yes').length;
    const registeredSisters = formFields.siblings.filter((sibling) => sibling.relation === 'sister' && sibling.currentlyStudying === 'yes').length;
    const householdAssets = [
      ...householdSelectionToApiRows(householdAssetSelection),
      ...otherHouseholdAssets
        .filter((asset) => asset.item.trim())
        .map((asset) => ({
          assetType: asset.item.trim() || 'Other',
          value: asset.value.trim() === '' ? undefined : Number(asset.value),
        })),
    ];

    return {
      ...formFields,
      relativeInformationDisclosed,
      totalBrothers,
      totalSisters,
      registeredBrothers,
      registeredSisters,
      siblingsUnder12,
      relatives: relativeInformationDisclosed ? formFields.relatives : [],
      houseOwner: '',
      householdAssets,
      status: saveStatus,
      id: applicationId,
    } as any;
  };

  useEffect(() => {
    if (!initialApplicationId || !hasLoadedPersistedState || lastAutosavedPayloadRef.current) return;

    lastAutosavedPayloadRef.current = JSON.stringify(buildApplicationRequestBody('draft'));
  }, [hasLoadedPersistedState, initialApplicationId]);

  useEffect(() => {
    if (!hasLoadedPersistedState || submittingAction !== null || showSubmissionSuccessModal) return;
    if (!hasUserEnteredDraftData(formData)) return;
    if (!hasAutosaveIdentifier(formData)) return;

    const body = buildApplicationRequestBody('draft');
    const payloadSignature = JSON.stringify(body);
    if (payloadSignature === lastAutosavedPayloadRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      setAutosaveStatus('saving');

      try {
        const currentApplicationId = latestApplicationIdRef.current;
        const response = await fetch('/api/applications', {
          method: currentApplicationId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...body,
            id: currentApplicationId,
            status: 'draft',
          }),
        });

        if (!response.ok) {
          throw new Error('Autosave failed');
        }

        const application = await response.json();
        latestApplicationIdRef.current = application.id;
        setApplicationId(application.id);
        setShouldPersistNewApplication(false);
        window.localStorage.removeItem(storageKey);
        lastAutosavedPayloadRef.current = JSON.stringify({
          ...body,
          id: application.id,
          status: 'draft',
        });
        setAutosaveStatus('saved');
        router.refresh();
      } catch (error) {
        setAutosaveStatus('error');
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [applicationId, formData, hasLoadedPersistedState, showSubmissionSuccessModal, storageKey, submittingAction, router]);

  useEffect(() => {
    const body = buildApplicationRequestBody('draft');
    const payloadSignature = JSON.stringify(body);
    const hasUnsyncedData = hasUserEnteredDraftData(formData) && payloadSignature !== lastAutosavedPayloadRef.current;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsyncedData) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasUnsyncedData) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== '_self') return;
      if (target.origin !== window.location.origin) return;
      if (target.pathname === window.location.pathname && target.search === window.location.search) return;

      const shouldLeave = window.confirm('Your latest changes may not be saved yet. Leave this page anyway?');
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [applicationId, formData]);

  const ensureDraftApplication = async () => {
    if (applicationId) return applicationId;

    setSubmittingAction('draft');
    setMessage(null);

    try {
      if (orphanAgeError) {
        setStep(7);
        throw new Error(orphanAgeError);
      }

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildApplicationRequestBody('draft')),
      });

      if (!response.ok) {
        const error = await response.json();
        const details = Array.isArray(error?.issues)
          ? validationIssuesMessage(error.issues)
          : error?.message;
        throw new Error(details ?? 'Unable to save draft before upload');
      }

      const application = await response.json();
      window.localStorage.removeItem(storageKey);
      setShouldPersistNewApplication(false);
      setApplicationId(application.id);
      latestApplicationIdRef.current = application.id;
      lastAutosavedPayloadRef.current = JSON.stringify({
        ...buildApplicationRequestBody('draft'),
        id: application.id,
        status: 'draft',
      });
      setAutosaveStatus('saved');
      setMessage('Draft saved successfully. Uploading document...');
      router.refresh();
      return application.id as string;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save draft before upload.';
      setMessage(message);
      throw new Error(message);
    } finally {
      setSubmittingAction(null);
    }
  };

  const submit = async (saveStatus: 'draft' | 'submitted') => {
    setSubmittingAction(saveStatus);
    setMessage(null);
    if (saveStatus === 'submitted') {
      setShowSubmissionSuccessModal(false);
    }

    try {
      if (orphanAgeError) {
        setStep(7);
        throw new Error(orphanAgeError);
      }

      const method = applicationId ? 'PATCH' : 'POST';
      const body = buildApplicationRequestBody(saveStatus);
      const response = await fetch('/api/applications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        const details = Array.isArray(error?.issues)
          ? validationIssuesMessage(error.issues)
          : error?.message;
        throw new Error(details ?? 'Unable to save application');
      }

      const application = await response.json();
      setApplicationId(application.id);
      latestApplicationIdRef.current = application.id;
      lastAutosavedPayloadRef.current = JSON.stringify({
        ...buildApplicationRequestBody('draft'),
        id: application.id,
        status: 'draft',
      });
      setAutosaveStatus(saveStatus === 'draft' ? 'saved' : null);
      if (saveStatus === 'submitted') {
        setShowSubmissionSuccessModal(true);
      } else {
        setMessage('Draft saved successfully.');
      }
      if (!initialApplicationId) {
        window.localStorage.removeItem(storageKey);
        setShouldPersistNewApplication(false);
      }
      if (!applicationId) {
        setStep(TOTAL_STEPS);
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed.');
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSubmissionDone = () => {
    setSubmissionDoneLoading(true);
    startLoading();
    setShowSubmissionSuccessModal(false);
    router.push('/applications');
    router.refresh();
  };

  const guardianDetailsNeeded = formData.motherAlive !== 'yes' || formData.motherIsGuardian !== 'yes';
  const motherIsLiving = formData.motherAlive === 'yes' || formData.motherAlive === 'separated';
  const siblingSummary = useMemo(() => {
    const totalBrothers = formData.siblings.filter((sibling) => sibling.relation === 'brother').length;
    const totalSisters = formData.siblings.filter((sibling) => sibling.relation === 'sister').length;
    const marriedSiblings = formData.siblings.filter((sibling) => sibling.maritalStatus === 'married').length;
    const siblingsUnder12 = formData.siblings.filter((sibling) => Number(sibling.age) < 12).length;

    return { totalBrothers, totalSisters, marriedSiblings, siblingsUnder12 };
  }, [formData.siblings]);
  const documentTypes = useMemo(() => {
    const types = [
      { type: 'child_photo', label: "Orphan's Picture" },
      { type: 'child_b_form', label: "Orphan's B form" },
      { type: 'father_cnic', label: "Father's CNIC Copy" },
      { type: 'father_death_certificate', label: "Father's Death Certificate Copy" },
    ];

    if (formData.motherAlive !== 'no') {
      types.push({ type: 'mother_cnic', label: "Mother's CNIC Copy" });
    }

    if (formData.motherAlive === 'no') {
      types.push({ type: 'mother_death_certificate', label: "Mother's Death Certificate Copy" });
    }

    if (guardianDetailsNeeded) {
      types.push({ type: 'guardian_cnic', label: "Guardian's CNIC Copy" });
    }

    if (formData.healthStatus === 'chronic_illness' || formData.healthStatus === 'disabled') {
      types.push({ type: 'medical_report', label: 'Medical Report' });
    }

    return types;
  }, [formData.healthStatus, formData.motherAlive, guardianDetailsNeeded]);
  const stepTitles = [
    'Father / والد',
    'Mother / والدہ',
    'Guardian / سرپرست',
    'Relatives / رشتہ دار',
    'Home / گھر',
    'Assets / اثاثے',
    'Child / بچہ',
    'Health / صحت',
    'Education & Skills / تعلیم',
    'Income / آمدنی',
    'Documents / دستاویزات',
    'Attestation/تصدیق',
    'Review / جائزہ',
  ];

  const getStepRequiredFields = (stepNumber: number): Array<keyof FormData> => {
    switch (stepNumber) {
      case 1:
        return ['fatherName', 'fatherDob', 'fatherCnic', 'fatherEducation', 'fatherTongue', 'fatherNativeArea', 'fatherOccupation', 'fatherDateOfDeath', 'fatherCauseOfDeath'];
      case 2: {
        const fields: Array<keyof FormData> = ['motherName', 'motherDob', 'motherAlive', 'motherCnic', 'motherEducation', 'motherTongue', 'motherNativeArea'];
        if (formData.motherAlive === 'no') fields.push('motherDeathDate', 'motherDeathCause');
        if (formData.motherAlive === 'separated') fields.push('motherSeparationReason');
        if (formData.motherAlive === 'yes') {
          fields.push('motherContact', 'motherOccupation');
          if (motherOccupationNeedsIncome(formData.motherOccupation)) fields.push('motherMonthlyIncome');
        }
        return fields;
      }
      case 3: {
        if (formData.motherAlive === 'yes' && formData.motherIsGuardian === 'yes') return [];
        if (!guardianDetailsNeeded) return [];
        const fields: Array<keyof FormData> = ['guardianName', 'guardianRelationship', 'guardianGender', 'guardianCnic', 'guardianContact', 'guardianMonthlyIncome'];
        if (formData.guardianFamilyHolder === 'yes') fields.push('guardianFamilyMembersCount');
        return fields;
      }
      case 4:
        return [];
      case 5: {
        const fields: Array<keyof FormData> = ['province', 'district', 'city', 'residentialArea', 'fullAddress', 'houseOwnershipStatus', 'houseCondition', 'residenceStructureType', 'residenceCategory', 'furnishingCondition'];
        if (formData.houseOwnershipStatus === 'rent') fields.push('monthlyRent', 'rentPaidBy');
        return fields;
      }
      case 6:
        return [];
      case 7: {
        const fields: Array<keyof FormData> = ['childName', 'gender', 'religion', 'syedStatus', 'nationality', 'bFormNumber', 'dateOfBirth', 'totalSiblings'];
        if (formData.religion === 'Other') fields.push('specifyReligion');
        if (formData.nationality === 'Other') fields.push('specifyNationality');
        return fields;
      }
      case 8: {
        const fields: Array<keyof FormData> = ['healthStatus'];
        if (formData.healthStatus === 'disabled') fields.push('disabilityType', 'disabilityCause');
        if (formData.healthStatus === 'chronic_illness') fields.push('chronicDisease', 'treatmentPlace', 'monthlyMedicalExpenses');
        return fields;
      }
      case 9: {
        const fields: Array<keyof FormData> = ['currentlyStudying', 'enrolledInMadrasa', 'currentSkillLearning'];
        if (formData.currentlyStudying) fields.push('currentClass', 'schoolName', 'schoolAddress', 'schoolDistanceKm', 'schoolTransportMode', 'schoolStudyingSince');
        if (formData.enrolledInMadrasa) fields.push('madrasaName', 'madrasaEducationDetails', 'educationStartCondition');
        if (formData.currentlyStudying || formData.enrolledInMadrasa) {
          fields.push('educationFree');
          if (formData.educationFree === 'no') fields.push('monthlySchoolFee');
        }
        if (formData.currentSkillLearning === 'yes') fields.push('currentSkill');
        if (formData.currentSkillLearning === 'no') {
          fields.push('technicalSkillInterest');
          if (formData.technicalSkillInterest === 'yes') fields.push('technicalSkill');
        }
        return fields;
      }
      case 10: {
        const fields: Array<keyof FormData> = ['totalFamilyMembers', 'householdHasMonthlyIncome', 'receivingOtherAid'];
        if (formData.householdHasMonthlyIncome === 'yes') {
          fields.push('householdEarnersCount', 'totalHouseholdIncome', 'childEarnsIncome');
          if (formData.childEarnsIncome === 'yes') fields.push('childWorkNature', 'childMonthlyIncome');
        }
        if (formData.receivingOtherAid) {
          fields.push('otherAidSource', 'monthlyAidAmount');
        } else {
          fields.push('assistanceApplied');
          if (formData.assistanceApplied === 'yes') fields.push('assistanceAppliedWhere');
        }
        return fields;
      }
      case 11:
        return [];
      case 12:
        return [];
      case 13:
        return [];
      default:
        return [];
    }
  };

  const isStepComplete = (stepNumber: number): boolean => {
    const requiredFields = getStepRequiredFields(stepNumber);
    const baseFieldsComplete = requiredFields.every((field) => {
      const value = formData[field];
      if (typeof value === 'boolean') return true;
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null;
    });

    if (!baseFieldsComplete) return false;

    // Special checks for steps with complex data or conditional logic
    switch (stepNumber) {
      case 4: // Relatives
        if (formData.relativeInformationDisclosed === '') return false;
        if (formData.relativeInformationDisclosed === 'no') return true;
        return formData.relatives.length > 0 && formData.relatives.every(r => 
          r.name.trim() !== '' && 
          r.occupation !== '' && 
          (r.occupation !== 'Other' || r.occupationOther.trim() !== '') &&
          r.monthlyIncome !== '' && 
          r.supportType !== '' &&
          (r.supportType !== 'other' || r.supportTypeOther.trim() !== '')
        );

      case 6: // Household Assets
        if (HOUSEHOLD_ASSET_KEYS.some(k => k !== 'other' && !formData.householdAssetSelection[k].answered)) return false;
        const selectedKeys = HOUSEHOLD_ASSET_KEYS.filter(k => k !== 'other' && formData.householdAssetSelection[k].answered && formData.householdAssetSelection[k].has);
        const assetsComplete = selectedKeys.every(k => {
          const entry = formData.householdAssetSelection[k];
          if (assetUsesGrams(k) && !entry.grams) return false;
          return entry.value !== '';
        });
        const othersComplete = formData.otherHouseholdAssets.every(a => a.item.trim() !== '' && a.value !== '');
        return assetsComplete && othersComplete;

      case 7: // Child & Siblings
        if (Number(formData.totalSiblings || 0) > 0) {
          if (formData.siblings.length === 0) return false;
          return formData.siblings.every(s => 
            s.name.trim() !== '' && 
            s.relation !== '' && 
            s.dob !== '' && 
            s.educationStatus !== '' && 
            s.currentlyStudying !== '' && 
            s.occupation !== '' && 
            s.monthlyIncomeOrFee !== '' && 
            s.maritalStatus !== ''
          );
        }
        return true;

      case 11: // Documents
        const requiredTypes = documentTypes.map((d) => d.type);
        const uploadedTypes = documents.map((d) => d.documentType);
        return requiredTypes.every((type) => uploadedTypes.includes(type));

      case 12: // Attestation/تصدیق
        return documents.some((document) => document.documentType === ATTESTATION_DOCUMENT_TYPE);

      case 13: // Review
        return formData.status === 'submitted';

      default:
        return true;
    }
  };

  const districtOptions = useMemo(() => {
    if (!formData.province) return [];
    const datasetOptions = getDistrictsByProvince(formData.province).map((district) => district.name);
    const customOptions = addressOptions
      .filter((option) => option.type === 'district' && option.province === formData.province)
      .map((option) => option.name);
    return Array.from(new Set([...datasetOptions, ...customOptions])).sort((a, b) => a.localeCompare(b));
  }, [addressOptions, formData.province]);

  const tehsilOptions = useMemo(() => {
    if (!formData.province || !formData.district) return [];
    const datasetOptions = getTehsilsByDistrict(formData.province, formData.district).map((tehsil) => tehsil.name);
    const customOptions = addressOptions
      .filter((option) => option.type === 'tehsil' && option.province === formData.province && option.district === formData.district)
      .map((option) => option.name);
    return Array.from(new Set([...datasetOptions, ...customOptions])).sort((a, b) => a.localeCompare(b));
  }, [addressOptions, formData.district, formData.province]);

  const renderRequiredMark = (required = true) => (required ? <span className="text-rose-600"> *</span> : null);
  const fieldWrapperClass = 'grid min-w-0 content-start gap-2 text-sm leading-6 text-slate-700 [&>span:first-child]:block [&>span:first-child]:min-w-0 [&>span:first-child]:break-words [&>span:first-child]:font-medium';
  const fieldLabelClass = 'block min-w-0 break-words font-medium leading-6';
  const fieldControlClass = 'min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:px-4 sm:text-sm';
  const disabledFieldControlClass = 'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
  const renderFieldLabel = (field: keyof FormData, required = true) => (
    <span className={fieldLabelClass}>{fieldLabel(field)}{renderRequiredMark(required)}</span>
  );

  const renderTextField = (field: keyof FormData, type = 'text', locked = false, onChange?: (value: string) => void, maxLength?: number, required = true) => {
    const isCnicField = field.toLowerCase().includes('cnic');

    return (
      <label key={field} className={fieldWrapperClass}>
        {renderFieldLabel(field, required)}
        <input
          value={formData[field] as string}
          onChange={(event) => (onChange ? onChange(event.target.value) : updateField(field, event.target.value))}
          type={type}
          readOnly={locked}
          inputMode={isCnicField ? 'numeric' : undefined}
          maxLength={maxLength ?? (isCnicField ? 15 : undefined)}
          placeholder={isCnicField ? '11111-2222222-3' : undefined}
          className={`${fieldControlClass} ${locked ? 'cursor-not-allowed bg-slate-100 text-slate-600' : ''}`}
        />
      </label>
    );
  };

  const renderTextareaField = (field: keyof FormData, maxLength?: number, required = true) => (
    <label key={field} className={`${fieldWrapperClass} sm:col-span-2`}>
      {renderFieldLabel(field, required)}
      <textarea
        value={formData[field] as string}
        onChange={(event) => updateField(field, event.target.value)}
        maxLength={maxLength}
        rows={4}
        className="min-h-28 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:px-4 sm:text-sm"
      />
    </label>
  );

  const renderSelectField = (
    field: keyof FormData,
    options: Array<{ value: string; label: string }>,
    onChange?: (value: string) => void,
    required = true,
  ) => (
    <label key={field} className={fieldWrapperClass}>
      {renderFieldLabel(field, required)}
      <select
        value={formData[field] as string}
        onChange={(event) => (onChange ? onChange(event.target.value) : updateField(field, event.target.value))}
        className={fieldControlClass}
      >
        {options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  const renderHomeSelectField = (
    field: keyof FormData,
    options: Array<{ value: string; label: string }>,
    onChange: (value: string) => void,
    disabled = false,
  ) => (
    <label key={field} className={fieldWrapperClass}>
      {renderFieldLabel(field)}
      <select
        value={formData[field] as string}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`${fieldControlClass} ${disabledFieldControlClass}`}
      >
        {options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  const renderSearchableAddressField = (
    field: 'district' | 'tehsil',
    options: string[],
    disabled: boolean,
    placeholder: string,
    onCommit: (value: string) => void,
  ) => {
    const listId = `${field}-options`;

    return (
      <label key={field} className={fieldWrapperClass}>
        {renderFieldLabel(field)}
        <input
          value={formData[field]}
          list={listId}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => updateField(field, event.target.value)}
          onBlur={(event) => {
            const value = normalizeAddressOption(event.target.value);
            if (value) onCommit(value);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            const value = normalizeAddressOption(event.currentTarget.value);
            if (value) onCommit(value);
          }}
          className={`${fieldControlClass} ${disabledFieldControlClass}`}
        />
        <datalist id={listId}>
          {options.map((option, index) => (
            <option key={`${option}-${index}`} value={option} />
          ))}
        </datalist>
        {!disabled && formData[field] && !hasOption(options, formData[field]) ? (
          <span className="text-xs text-slate-500">Press Enter or leave the field to add this option for all field workers.</span>
        ) : null}
      </label>
    );
  };

  const renderSelectWithOther = (
    field: keyof FormData,
    options: Array<{ value: string; label: string }>,
    otherLabel: string,
    onChange?: (value: string) => void,
    required = true,
  ) => {
    const predefinedValues = options.map((option) => option.value);
    const currentValue = formData[field] as string;
    const selectValue = currentValue && !predefinedValues.includes(currentValue) ? 'Other' : currentValue;

    return (
      <Fragment key={field}>
        <label className={fieldWrapperClass}>
          {renderFieldLabel(field, required)}
          <select
            value={selectValue}
            onChange={(event) => (onChange ? onChange(event.target.value) : updateField(field, event.target.value))}
            className={fieldControlClass}
          >
            {options.map((option, index) => (
              <option key={`${option.value}-${index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {selectValue === 'Other' ? (
          <label className={fieldWrapperClass}>
            <span className={fieldLabelClass}>{otherLabel}</span>
            <input
              value={currentValue === 'Other' ? '' : currentValue}
              onChange={(event) => (onChange ? onChange(event.target.value) : updateField(field, event.target.value))}
              type="text"
              className={fieldControlClass}
            />
          </label>
        ) : null}
      </Fragment>
    );
  };

  const renderEducationSelect = (field: keyof FormData) => renderSelectField(field, EDUCATION_OPTIONS);

  const renderDeathCauseSelect = (field: keyof FormData) => renderSelectField(field, DEATH_CAUSE_OPTIONS);

  const renderOccupationSelect = (field: keyof FormData, options = OCCUPATION_OPTIONS) =>
    renderSelectWithOther(field, options, 'Other Occupation / دیگر پیشہ');

  const renderNativeAreaField = (field: keyof FormData) =>
    renderSelectWithOther(field, NATIVE_AREA_OPTIONS, 'Other Native Area / دیگر آبائی علاقہ');

  const renderMotherTongueField = (field: keyof FormData) =>
    renderSelectWithOther(field, MOTHER_TONGUE_OPTIONS, 'Other Mother Tongue / دیگر مادری زبان');

  const renderGuardianRelationshipField = () =>
    renderSelectWithOther('guardianRelationship', GUARDIAN_RELATIONSHIP_OPTIONS, 'Other Guardian Relationship / دیگر سرپرست کا تعلق');

  const renderMotherSeparationReasonField = () =>
    renderSelectWithOther('motherSeparationReason', MOTHER_SEPARATION_REASON_OPTIONS, 'Other Separation Reason / علیحدگی کی دیگر وجہ');

  const renderBooleanSelect = (
    field: keyof FormData,
    onChange?: (value: boolean) => void,
    yesLabel = 'Yes',
    noLabel = 'No',
    required = true,
  ) => (
    <label key={field} className={fieldWrapperClass}>
      {renderFieldLabel(field, required)}
      <select
        value={formData[field] ? 'yes' : 'no'}
        onChange={(event) => {
          const nextValue = event.target.value === 'yes';
          if (onChange) {
            onChange(nextValue);
          } else {
            updateField(field, nextValue);
          }
        }}
        className={fieldControlClass}
      >
        <option value="no">{noLabel}</option>
        <option value="yes">{yesLabel}</option>
      </select>
    </label>
  );

  const renderCheckbox = (field: keyof FormData, labelText?: string) => (
    <label key={field} className="flex min-h-12 items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-4 text-sm leading-6 text-slate-700 sm:items-center sm:px-4">
      <input
        type="checkbox"
        checked={formData[field] as boolean}
        onChange={(event) => updateField(field, event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 sm:mt-0"
      />
      <span className="min-w-0 break-words">{labelText ?? fieldLabel(field)}</span>
    </label>
  );

  const shouldShowField = (field: keyof FormData) => {
    if (['motherDeathDate', 'motherDeathCause'].includes(field)) return formData.motherAlive === 'no';
    if (field === 'motherSeparationReason') return formData.motherAlive === 'separated';
    if (['motherContact', 'motherOccupation'].includes(field)) return formData.motherAlive === 'yes';
    if (field === 'motherRemarried') return motherIsLiving;
    if (field === 'motherMonthlyIncome') return formData.motherAlive === 'yes' && motherOccupationNeedsIncome(formData.motherOccupation);
    if (field === 'guardianOccupation') return guardianDetailsNeeded && Boolean(formData.guardianGender);
    if (['guardianName', 'guardianRelationship', 'guardianGender', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue', 'guardianNativeArea', 'guardianContact', 'guardianFamilyHolder', 'guardianMonthlyIncome'].includes(field)) return guardianDetailsNeeded;
    if (field === 'guardianFamilyMembersCount') return guardianDetailsNeeded && formData.guardianFamilyHolder === 'yes';
    if (['monthlyRent', 'rentPaidBy'].includes(field)) return formData.houseOwnershipStatus === 'rent';
    if (field === 'disabilityDetails') return formData.healthStatus === 'disabled';
    if (field === 'treatmentPlace') return formData.healthStatus === 'chronic_illness';
    if (field === 'specifyNationality') return formData.nationality === 'Other';
    if (field === 'specifyReligion') return formData.religion === 'Other';
    if (field === 'monthlyMedicalExpenses') return formData.healthStatus === 'chronic_illness' || formData.healthStatus === 'disabled';
    if (['currentClass', 'schoolName', 'schoolAddress', 'educationFeeStatus'].includes(field)) return formData.currentlyStudying;
    if (['notStudyingReason', 'educationStartCondition'].includes(field)) return !formData.currentlyStudying;
    if (field === 'monthlySchoolFee') return formData.currentlyStudying && formData.educationFeeStatus === 'paid';
    if (['madrasaName', 'madrasaEducationDetails'].includes(field)) return formData.enrolledInMadrasa;
    if (['otherAidSource', 'monthlyAidAmount'].includes(field)) return formData.receivingOtherAid;
    return true;
  };

  const formatReviewValue = (field: keyof FormData): string => {
    if (field === 'householdAssetSelection') {
      const selected = HOUSEHOLD_ASSET_KEYS
        .filter((key) => formData.householdAssetSelection[key].has)
        .map((key) => {
          const entry = formData.householdAssetSelection[key];
          const grams = assetUsesGrams(key) && entry.grams ? `, ${entry.grams} grams` : '';
          const amount = entry.value ? `${entry.value} PKR` : 'value missing';
          return `${householdAssetDisplayLabel(key)}: ${amount}${grams}`;
        });

      return selected.length ? selected.join('; ') : '-';
    }

    const value = formData[field];
    if (field === 'tehsil' && (!value || value === 'unknown')) return 'Not Available / Unknown';
    if (field === 'gpsAccuracyMeters' && value) return `${value} m`;
    if (field === 'gpsCapturedAt' && value) {
      const date = new Date(value as string);
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? `${value.length} record(s)` : '-';
    return typeof value === 'string' ? value || '-' : '-';
  };

  const reviewSections: Array<{ title: string; fields: Array<keyof FormData> }> = [
    { title: 'Mother', fields: ['motherName', 'motherTongue', 'motherNativeArea', 'motherAlive', 'motherSeparationReason', 'motherContact', 'motherOccupation', 'motherMonthlyIncome', 'motherRemarried', 'motherDeathDate', 'motherDeathCause'] },
    { title: 'Guardian', fields: ['motherIsGuardian', 'guardianName', 'guardianRelationship', 'guardianGender', 'guardianContact', 'guardianCnic', 'guardianOccupation', 'guardianFamilyHolder', 'guardianFamilyMembersCount', 'guardianMonthlyIncome'] },
    { title: 'Address', fields: ['province', 'district', 'tehsil', 'city', 'residentialArea', 'fullAddress'] },
    { title: 'GPS', fields: ['latitude', 'longitude', 'gpsAccuracyMeters', 'gpsCapturedAt'] },
    { title: 'Home', fields: ['houseOwnershipStatus', 'monthlyRent', 'rentPaidBy', 'houseCondition', 'residenceStructureType', 'residenceCategory', 'houseConditionRemarks', 'electricityAvailable', 'gasAvailable', 'waterAvailable', 'furnishingCondition', 'furnishingConditionRemarks'] },
    { title: 'Relatives', fields: ['relativeInformationDisclosed', 'relatives'] },
    { title: 'Household Assets', fields: ['householdAssetSelection'] },
    { title: 'Child', fields: ['childName', 'gender', 'religion', 'specifyReligion', 'syedStatus', 'nationality', 'specifyNationality', 'bFormNumber', 'dateOfBirth', 'age', 'totalSiblings', 'siblings'] },
    { title: 'Health', fields: ['healthStatus', 'disabilityType', 'disabilityCause', 'disabilityDetails', 'disabilityCauseDetails', 'disabilitySince', 'treatmentOngoing', 'chronicDisease', 'specifyDisease', 'illnessSince', 'treatmentPlace', 'monthlyMedicalExpenses'] as Array<keyof FormData> },
    { title: 'Education and Skills', fields: ['currentlyStudying', 'currentClass', 'schoolName', 'schoolAddress', 'schoolDistanceKm', 'schoolTransportMode', 'schoolStudyingSince', 'enrolledInMadrasa', 'madrasaName', 'madrasaEducationDetails', 'educationUndertakingAccepted', 'educationFree', 'monthlySchoolFee', 'currentSkillLearning', 'currentSkill', 'childHobbies', 'technicalSkillInterest', 'technicalSkill'] as Array<keyof FormData> },
    { title: 'Income and Aid', fields: ['totalFamilyMembers', 'householdHasMonthlyIncome', 'householdEarnersCount', 'totalHouseholdIncome', 'childEarnsIncome', 'childWorkNature', 'childMonthlyIncome', 'receivingOtherAid', 'otherAidSource', 'monthlyAidAmount', 'assistanceApplied', 'assistanceAppliedWhere'] as Array<keyof FormData> },
  ];

  const steps = Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1);
  const currentStepTitle = stepTitles[step - 1] ?? '';
  const progressPercentage = Math.round((step / TOTAL_STEPS) * 100);
  const attestationFormData = {
    applicationId,
    registrationNumber: formData.registrationNumber,
    childName: formData.childName,
    fatherName: formData.fatherName,
    schoolName: formData.schoolName,
    bFormNumber: formData.bFormNumber,
    guardianName: formData.guardianName,
    motherName: formData.motherName,
    guardianContact: formData.guardianContact,
    motherContact: formData.motherContact,
    collectorId: formData.collectorId,
    collectorName: formData.collectorName,
    collectorContact: formData.collectorContact,
  };

  const handleDownloadAttestation = async () => {
    try {
      await downloadAttestationPdf(attestationFormData);
    } catch {
      setMessage('Unable to download the attestation PDF.');
    }
  };

  const handlePrintAttestation = () => {
    const opened = printAttestationForm(attestationFormData);
    if (!opened) {
      setMessage('Please allow pop-ups to print the attestation packet.');
    }
  };

  return (
    <div ref={wizardRef} className="min-w-0 scroll-mt-24 space-y-5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm [&_h2]:text-lg [&_h2]:leading-7 [&_h3]:break-words sm:space-y-6 sm:p-8 sm:[&_h2]:text-xl">
      {showSubmissionSuccessModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-success-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 id="submission-success-title" className="mt-5 text-xl font-semibold text-slate-950">
              Form Successfully Submitted
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The application has been submitted successfully and is ready for review.
            </p>
            <button
              type="button"
              onClick={handleSubmissionDone}
              disabled={submissionDoneLoading}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submissionDoneLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-white" aria-hidden="true" /> : null}
              {submissionDoneLoading ? 'Loading...' : 'Done'}
            </button>
          </div>
        </div>
      ) : null}
      
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {step} of {TOTAL_STEPS}</p>
              <p className="mt-1 break-words text-base font-semibold leading-6 text-slate-950">{currentStepTitle}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">{progressPercentage}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 sm:hidden">
          {steps.map((item) => {
            const complete = isStepComplete(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => goToStep(item)}
                aria-label={`Go to step ${item}: ${stepTitles[item - 1]}`}
                className={`flex h-10 min-w-10 snap-start items-center justify-center rounded-lg border text-sm font-semibold transition ${item === step ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : complete ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {complete && item !== step ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : item}
              </button>
            );
          })}
        </div>

        <div className="hidden gap-2 sm:grid sm:grid-cols-4">
          {steps.map((item) => {
            const complete = isStepComplete(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => goToStep(item)}
                className={`relative min-w-0 rounded-lg border px-3 py-3 text-sm font-semibold leading-5 transition ${item === step ? 'border-blue-600 bg-blue-50 text-blue-900' : complete ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'}`}
              >
                <span className="flex min-w-0 items-center justify-center gap-1.5">
                  {complete ? (
                    <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : null}
                  <span className="min-w-0 truncate">{item}. {stepTitles[item - 1]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {message ? (
        <div className={`rounded-lg border p-4 text-sm ${message.toLowerCase().includes('success') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          <div className="whitespace-pre-wrap font-medium">{message}</div>
        </div>
      ) : null}
      {autosaveStatus ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            autosaveStatus === 'error'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {autosaveStatus === 'saving'
            ? 'Saving draft automatically...'
            : autosaveStatus === 'saved'
              ? 'Draft autosaved.'
              : 'Autosave could not finish. Use Save Draft before leaving.'}
        </div>
      ) : null}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Deceased Father Details / مرحوم والد کی تفصیلات</h2>
            <p className="mt-1 text-sm text-slate-600">Add the father's personal, educational, and death information.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['fatherName', 'fatherDob', 'fatherAge', 'fatherCnic', 'fatherEducation', 'fatherTongue', 'fatherNativeArea', 'fatherOccupation', 'fatherDateOfDeath', 'fatherCauseOfDeath'].map((field) =>
              field === 'fatherDob' || field === 'fatherDateOfDeath'
                ? renderTextField(field as keyof FormData, 'date')
                : field === 'fatherEducation'
                  ? renderEducationSelect(field as keyof FormData)
                  : field === 'fatherTongue'
                    ? renderMotherTongueField(field as keyof FormData)
                    : field === 'fatherNativeArea'
                      ? renderNativeAreaField(field as keyof FormData)
                  : field === 'fatherCauseOfDeath'
                    ? renderDeathCauseSelect(field as keyof FormData)
                    : field === 'fatherOccupation'
                      ? renderOccupationSelect(field as keyof FormData)
                    : renderTextField(field as keyof FormData),
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Mother Details / والدہ کی تفصیلات</h2>
            <p className="mt-1 text-sm text-slate-600">Capture the mother's identity, income, and marital status.</p>
          </div>
         
          <div className="grid gap-4 sm:grid-cols-2">
            {['motherName', 'motherDob', 'motherAlive', 'motherAge', 'motherCnic', 'motherEducation', 'motherTongue', 'motherNativeArea'].map((field) =>
              field === 'motherDob'
                ? renderTextField(field as keyof FormData, 'date', false, handleMotherDobChange, undefined, true)
                : field === 'motherAlive'
                  ? (
                      <>
                        {renderSelectField('motherAlive', [
                          { value: '', label: 'Select living status' },
                          { value: 'yes', label: 'Alive / زندہ' },
                          { value: 'separated', label: 'Alive but separated / زندہ مگر علیحدہ' },
                          { value: 'no', label: 'Deceased / وفات شدہ' },
                        ], handleMotherAliveChange, true)}
                        {formData.motherAlive === 'no' ? renderTextField('motherDeathDate', 'date', false, handleMotherDeathDateChange, undefined, true) : null}
                      </>
                    )
                : field === 'motherAge' && formData.motherDob && (motherIsLiving || (formData.motherAlive === 'no' && formData.motherDeathDate))
                  ? renderTextField(field as keyof FormData, 'number', true, undefined, undefined, true)
                : field === 'motherEducation'
                  ? renderSelectField(field as keyof FormData, EDUCATION_OPTIONS, undefined, true)
                  : field === 'motherTongue'
                    ? renderSelectWithOther(field as keyof FormData, MOTHER_TONGUE_OPTIONS, 'Other Mother Tongue / دیگر مادری زبان', undefined, true)
                  : field === 'motherNativeArea'
                    ? renderSelectWithOther(field as keyof FormData, NATIVE_AREA_OPTIONS, 'Other Native Area / دیگر آبائی علاقہ', undefined, true)
                    : renderTextField(field as keyof FormData, 'text', false, undefined, undefined, true),
            )}
            {formData.motherAlive === 'separated' ? renderSelectWithOther('motherSeparationReason', MOTHER_SEPARATION_REASON_OPTIONS, 'Other Separation Reason / علیحدگی کی دیگر وجہ', undefined, true) : null}
            {formData.motherAlive === 'no' ? (
              <>
                {renderSelectField('motherDeathCause', DEATH_CAUSE_OPTIONS, undefined, true)}
              </>
            ) : null}
            {motherIsLiving ? (
              <>
                {formData.motherAlive === 'yes' ? renderTextField('motherContact', 'text', false, undefined, undefined, true) : null}
                {formData.motherAlive === 'yes' ? renderSelectWithOther('motherOccupation', FEMALE_OCCUPATION_OPTIONS, 'Other Occupation / دیگر پیشہ', handleMotherOccupationChange, true) : null}
                {formData.motherAlive === 'yes' && motherOccupationNeedsIncome(formData.motherOccupation) ? renderSelectField('motherMonthlyIncome', MONTHLY_INCOME_OPTIONS, undefined, true) : null}
                {renderBooleanSelect('motherRemarried', undefined, 'Yes', 'No', true)}
              </>
            ) : null}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Guardian Details / سرپرست کی تفصیلات</h2>
            <p className="mt-1 text-sm text-slate-600">Record the guardian's contact, occupation, family holder status, and income.</p>
          </div>
          {formData.motherAlive === 'yes' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {renderSelectField('motherIsGuardian', [
                { value: '', label: 'Select guardian status' },
                { value: 'yes', label: 'Mother is guardian / والدہ سرپرست ہیں' },
                { value: 'no', label: 'Other guardian / دوسرا سرپرست' },
              ], handleMotherIsGuardianChange)}
              
            </div>
          ) : null}
          {formData.motherAlive === 'yes' && formData.motherIsGuardian === 'yes' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Guardian details are hidden because the mother is marked as the guardian.
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {guardianDetailsNeeded ? (
              <>
                {['guardianName', 'guardianGender', 'guardianRelationship', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue', 'guardianNativeArea', 'guardianContact'].map((field) =>
                  field === 'guardianEducation'
                    ? renderEducationSelect(field as keyof FormData)
                    : field === 'guardianRelationship'
                      ? renderGuardianRelationshipField()
                    : field === 'guardianGender'
                      ? renderSelectField('guardianGender', [
                          { value: '', label: 'Select gender' },
                          { value: 'male', label: 'Male / مرد' },
                          { value: 'female', label: 'Female / عورت' },
                        ], handleGuardianGenderChange)
                      : renderTextField(field as keyof FormData),
                )}
                {formData.guardianGender === 'male' ? renderOccupationSelect('guardianOccupation') : null}
                {formData.guardianGender === 'female' ? renderOccupationSelect('guardianOccupation', FEMALE_OCCUPATION_OPTIONS) : null}
                {renderSelectField('guardianFamilyHolder', [
                  { value: '', label: 'Select family holder status' },
                  { value: 'yes', label: 'Yes / ہاں' },
                  { value: 'no', label: 'No / نہیں' },
                ], handleGuardianFamilyHolderChange)}
                {formData.guardianFamilyHolder === 'yes' ? renderTextField('guardianFamilyMembersCount', 'number') : null}
                {renderTextField('guardianMonthlyIncome', 'number')}
              </>
            ) : null}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Close Relatives / قریبی رشتہ دار</h2>
            <p className="mt-1 text-sm text-slate-600">Optionally collect close relative details for support assessment and emergency reference.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold leading-6 text-slate-900">
                Do you want to provide close relatives' information? / قریبی رشتہ داروں کی معلومات فراہم کرنا چاہتے ہیں؟
              </legend>
              <div className="grid gap-3 text-sm text-slate-700 sm:flex sm:flex-wrap">
                <label className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 sm:w-auto">
                  <input
                    type="radio"
                    name="relativeInformationDisclosed"
                    className="h-4 w-4 accent-blue-600"
                    checked={formData.relativeInformationDisclosed === 'yes'}
                    onChange={() => handleRelativeDisclosureChange('yes')}
                  />
                  <span>Yes / ہاں</span>
                </label>
                <label className="flex min-h-11 w-full cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 sm:w-auto sm:items-center">
                  <input
                    type="radio"
                    name="relativeInformationDisclosed"
                    className="mt-1 h-4 w-4 accent-blue-600 sm:mt-0"
                    checked={formData.relativeInformationDisclosed === 'no'}
                    onChange={() => handleRelativeDisclosureChange('no')}
                  />
                  <span className="break-words">No / Not Willing to Disclose / نہیں / معلومات فراہم نہیں کرنا چاہتے</span>
                </label>
              </div>
            </fieldset>
          </div>
          {formData.relativeInformationDisclosed === 'yes' ? (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Relative Entries / رشتہ داروں کی تفصیلات</h3>
                <p className="text-sm text-slate-600">Add one card for each close relative willing to share information.</p>
              </div>
              <button type="button" onClick={() => addArrayItem('relatives')} className="min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 sm:w-auto">
                Add Relative
              </button>
            </div>
            <div className="space-y-4">
              {formData.relatives.map((relative, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={fieldWrapperClass}>
                      <span>Relative Relationship / رشتہ داری *</span>
                      <select
                        value={relative.relativeType}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { relativeType: event.target.value as RelativeInput['relativeType'] })}
                        className={fieldControlClass}
                      >
                        {RELATIVE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className={fieldWrapperClass}>
                      <span>Relative Name / نام *</span>
                      <input
                        value={relative.name}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { name: event.target.value })}
                        className={fieldControlClass}
                      />
                    </label>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <label className={fieldWrapperClass}>
                      <span>Occupation / پیشہ *</span>
                      <select
                        value={relative.occupation}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, {
                          occupation: event.target.value,
                          ...(event.target.value === 'Other' ? {} : { occupationOther: '' }),
                        })}
                        className={`${fieldControlClass} w-full min-w-0`}
                      >
                        {OCCUPATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    {relative.occupation === 'Other' ? (
                      <label className={fieldWrapperClass}>
                        <span>Specify Occupation / پیشے کی وضاحت کریں *</span>
                        <input
                          value={relative.occupationOther}
                          onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { occupationOther: event.target.value })}
                          className={`${fieldControlClass} w-full min-w-0`}
                        />
                      </label>
                    ) : null}
                    <label className={fieldWrapperClass}>
                      <span>Monthly Income / ماہانہ آمدنی *</span>
                      <select
                        value={relative.monthlyIncome}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { monthlyIncome: event.target.value })}
                        className={`${fieldControlClass} w-full min-w-0`}
                      >
                        {MONTHLY_INCOME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className={`${fieldWrapperClass} min-w-0 lg:col-span-2 xl:col-span-1`}>
                      <span>Nature of Support / یتیم بچے کی معاونت *</span>
                      <select
                        value={relative.supportType}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, {
                          supportType: event.target.value,
                          ...(event.target.value === 'other' ? {} : { supportTypeOther: '' }),
                        })}
                        className={`${fieldControlClass} w-full min-w-0`}
                      >
                        {RELATIVE_SUPPORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    {relative.supportType === 'other' ? (
                      <label className={`${fieldWrapperClass} min-w-0 lg:col-span-2 xl:col-span-1`}>
                        <span>Specify Support / معاونت کی وضاحت کریں *</span>
                        <input
                          value={relative.supportTypeOther}
                          onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { supportTypeOther: event.target.value })}
                          className={`${fieldControlClass} w-full min-w-0`}
                        />
                      </label>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('relatives', index)}
                    className="mt-4 min-h-11 w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 sm:w-auto"
                  >
                    Remove Relative
                  </button>
                </div>
              ))}
            </div>
          </div>
          ) : null}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Home Details / گھر کی تفصیلات</h2>
            <p className="mt-1 text-sm text-slate-600">Capture the household address and property status.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">GPS Location / GPS مقام</h3>
                  <p className="mt-1 text-sm text-slate-600">Capture latitude and longitude. Please enter the address fields manually.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  disabled={isCapturingGps}
                  className="min-h-12 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isCapturingGps ? 'Capturing GPS...' : 'GPS مقام حاصل کریں / Capture GPS Location'}
                </button>
              </div>
              {gpsMessage ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{gpsMessage}</div> : null}
              {gpsWarning ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{gpsWarning}</div> : null}
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Latitude</p>
                  <p className="mt-1 break-words text-slate-900">{formData.latitude || '-'}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Longitude</p>
                  <p className="mt-1 break-words text-slate-900">{formData.longitude || '-'}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Accuracy</p>
                  <p className="mt-1 break-words text-slate-900">{formData.gpsAccuracyMeters ? `${formData.gpsAccuracyMeters} m` : '-'}</p>
                </div>
              </div>
            </div>
            {renderHomeSelectField(
              'province',
              [
                { value: '', label: 'Select province' },
                ...pakistanAddressData.map((item) => ({ value: item.province, label: item.province })),
              ],
              handleProvinceChange,
            )}
            {renderSearchableAddressField(
              'district',
              districtOptions,
              !formData.province,
              formData.province ? 'Search or add district' : 'Select province first',
              commitDistrict,
            )}
            {renderSearchableAddressField(
              'tehsil',
              ['unknown', ...tehsilOptions],
              !formData.district,
              formData.district ? 'Search or add tehsil' : 'Select district first',
              commitTehsil,
            )}
            {renderTextField('city')}
            {renderTextField('residentialArea', 'text', false, (value) => updateField('residentialArea', value.slice(0, 150)), 150)}
            {renderTextareaField('fullAddress')}
            {renderSelectField('houseOwnershipStatus', [
              { value: '', label: 'Select ownership status' },
              { value: 'owned', label: 'Owned / ذاتی' },
              { value: 'rent', label: 'Rent / کرایہ' },
              { value: 'other', label: 'Other / دیگر' },
            ], handleHouseOwnershipStatusChange)}
            {formData.houseOwnershipStatus === 'rent' ? (
              <>
                {renderTextField('monthlyRent', 'number')}
                {renderTextField('rentPaidBy')}
              </>
            ) : null}
            {renderSelectField('houseCondition', [
              { value: '', label: 'Select house condition' },
              { value: 'better', label: 'Better / بہتر' },
              { value: 'appropriate', label: 'Appropriate / مناسب' },
              { value: 'worst', label: 'Worst / خراب' },
            ])}
            {renderSelectField('residenceStructureType', [
              { value: '', label: 'Select residence structure type' },
              { value: 'pakka', label: 'Pakka / پکا' },
              { value: 'kacha', label: 'Kacha / کچا' },
              { value: 'mixed', label: 'Mixed / مخلوط (پکا + کچا)' },
            ])}
            {renderSelectField('residenceCategory', [
              { value: '', label: 'Select residence category' },
              { value: 'house', label: 'House / مکان' },
              { value: 'flat', label: 'Flat / فلیٹ / اپارٹمنٹ' },
              { value: 'camp', label: 'Camp / کیمپ / عارضی رہائش' },
              { value: 'hut', label: 'Hut / جھونپڑی' },
              { value: 'shared_residence', label: 'Shared Residence / مشترکہ رہائش' },
            ])}
            {renderTextField('houseConditionRemarks')}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <h3 className="text-base font-semibold text-slate-900">Basic Utility Facilities / بنیادی سہولیات</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {renderBooleanSelect('electricityAvailable', undefined, 'Yes / ہاں', 'No / نہیں')}
                {renderBooleanSelect('gasAvailable', undefined, 'Yes / ہاں', 'No / نہیں')}
                {renderBooleanSelect('waterAvailable', undefined, 'Yes / ہاں', 'No / نہیں')}
              </div>
            </div>
            {renderSelectField('furnishingCondition', [
              { value: '', label: 'Select furnishing condition' },
              { value: 'better', label: 'Better / بہتر' },
              { value: 'appropriate', label: 'Appropriate / مناسب' },
              { value: 'worst', label: 'Worst / خراب' },
            ])}
            {renderTextField('furnishingConditionRemarks')}
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Household Assets / گھریلو اثاثے</h2>
            
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {HOUSEHOLD_ASSET_KEYS.map((key) => {
              if (key === 'other') {
                return (
                  <div key={key} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:items-center">
                      <span className="text-base font-semibold text-slate-900">{householdAssetDisplayLabel(key)}</span>
                      <button
                        type="button"
                        onClick={addOtherHouseholdAsset}
                        className="min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 sm:w-auto"
                      >
                        + Add / شامل کریں
                      </button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {formData.otherHouseholdAssets.length === 0 ? (
                        <p className="text-sm text-slate-500">No other items added.</p>
                      ) : (
                        formData.otherHouseholdAssets.map((asset, index) => (
                          <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]">
                            <label className="grid min-w-0 gap-1.5 text-sm text-slate-700">
                              <span>Item / چیز</span>
                              <input
                                value={asset.item}
                                onChange={(event) => updateOtherHouseholdAsset(index, { item: event.target.value })}
                                className="min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:px-4 sm:text-sm"
                              />
                            </label>
                            <label className="grid min-w-0 gap-1.5 text-sm text-slate-700">
                              <span>Value (PKR) / قدر</span>
                              <input
                                value={asset.value}
                                onChange={(event) => updateOtherHouseholdAsset(index, { value: event.target.value })}
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="any"
                                className="min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:px-4 sm:text-sm"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => removeOtherHouseholdAsset(index)}
                              className="min-h-12 w-full self-end rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 sm:w-auto"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              }
              const entry = formData.householdAssetSelection[key];
              const showGrams = assetUsesGrams(key);
              return (
                <div key={key} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:items-center">
                    <span className="text-base font-semibold leading-6 text-slate-900">
                      {householdAssetDisplayLabel(key)}
                    </span>
                    <div className="flex w-full items-center justify-between gap-3 text-sm text-slate-700 sm:w-auto sm:justify-start" role="group" aria-label={`${householdAssetDisplayLabel(key)} موجود ہے؟`}>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name={`household-asset-${key}`}
                          className="h-4 w-4 accent-blue-600"
                          checked={entry.answered && !entry.has}
                          onChange={() => handleHouseholdAssetHasChange(key, false)}
                        />
                        <span dir="rtl">نہیں</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name={`household-asset-${key}`}
                          className="h-4 w-4 accent-blue-600"
                          checked={entry.answered && entry.has}
                          onChange={() => handleHouseholdAssetHasChange(key, true)}
                        />
                        <span dir="rtl">ہاں</span>
                      </label>
                    </div>
                  </div>
                  {entry.answered && entry.has ? (
                    <div className={`mt-3 grid gap-3 ${showGrams ? 'sm:grid-cols-2' : ''}`}>
                      {showGrams ? (
                        <label className="grid min-w-0 gap-1.5 text-sm text-slate-700">
                          <span>
                            گرام <span className="text-slate-500">(Grams)</span>
                          </span>
                          <input
                            value={entry.grams}
                            onChange={(event) => updateHouseholdAssetEntry(key, { grams: event.target.value })}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            className="min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:px-4 sm:text-sm"
                            placeholder="0"
                          />
                        </label>
                      ) : null}
                      <label className={`grid min-w-0 gap-1.5 text-sm text-slate-700 ${showGrams ? '' : 'sm:col-span-2'}`}>
                        <span>
                          قدر (روپے) <span className="text-slate-500">/ Value (PKR)</span>
                        </span>
                        <input
                          value={entry.value}
                          onChange={(event) => updateHouseholdAssetEntry(key, { value: event.target.value })}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          className="min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:px-4 sm:text-sm"
                          placeholder="0"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Orphan Child Details / یتیم بچے کی تفصیلات</h2>
            <p className="mt-1 text-sm text-slate-600">Add structured child details and sibling information.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderTextField('childName')}
            {renderSelectField('gender', GENDER_OPTIONS)}
            {renderSelectField('religion', RELIGION_OPTIONS, handleReligionChange)}
            {formData.religion === 'Other' ? renderTextField('specifyReligion') : null}
            {renderSelectField('syedStatus', SYED_STATUS_OPTIONS)}
            {renderSelectField('nationality', NATIONALITY_OPTIONS, handleNationalityChange)}
            {formData.nationality === 'Other' ? renderTextField('specifyNationality') : null}
            {renderTextField('bFormNumber')}
            {renderTextField('dateOfBirth', 'date', false, handleChildDobChange)}
            {renderTextField('age', 'number', true)}
            {orphanAgeError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700 sm:col-span-2">
                {orphanAgeError}
              </div>
            ) : null}
            {renderTextField('totalSiblings', 'number', false, handleTotalSiblingsChange)}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Brothers</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{siblingSummary.totalBrothers}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Sisters</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{siblingSummary.totalSisters}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Married</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{siblingSummary.marriedSiblings}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Under 12</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{siblingSummary.siblingsUnder12}</p>
            </div>
          </div>
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <p className="text-sm font-semibold text-slate-900">Sibling Information / بہن بھائیوں کی معلومات</p>
            {formData.siblings.map((sibling, index) => (
              <div key={index} className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">Sibling {index + 1}</h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className={fieldWrapperClass}>
                    <span>Sibling Name / نام *</span>
                    <input
                      value={sibling.name}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { name: event.target.value })}
                      className={fieldControlClass}
                    />
                  </label>
                  <label className={fieldWrapperClass}>
                    <span>Relation / رشتہ *</span>
                    <select
                      value={sibling.relation}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { relation: event.target.value })}
                      className={fieldControlClass}
                    >
                      {SIBLING_RELATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={fieldWrapperClass}>
                    <span>DOB / تاریخ پیدائش *</span>
                    <input
                      value={sibling.dob}
                      onChange={(event) => handleSiblingDobChange(index, event.target.value)}
                      type="date"
                      className={fieldControlClass}
                    />
                  </label>
                  <label className={fieldWrapperClass}>
                    <span>Age / عمر</span>
                    <input
                      value={sibling.age}
                      readOnly
                      type="number"
                      className={`${fieldControlClass} cursor-not-allowed bg-slate-100 text-slate-600`}
                    />
                  </label>
                  <label className={fieldWrapperClass}>
                    <span>Education Status / تعلیمی حیثیت *</span>
                    <select
                      value={sibling.educationStatus}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { educationStatus: event.target.value })}
                      className={fieldControlClass}
                    >
                      {EDUCATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={fieldWrapperClass}>
                    <span>Currently Studying / زیرِ تعلیم *</span>
                    <select
                      value={sibling.currentlyStudying}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { currentlyStudying: event.target.value })}
                      className={fieldControlClass}
                    >
                      <option value="">Select status</option>
                      <option value="yes">Yes / ہاں</option>
                      <option value="no">No / نہیں</option>
                    </select>
                  </label>
                  <label className={fieldWrapperClass}>
                    <span>Occupation / پیشہ *</span>
                    <select
                      value={sibling.occupation}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { occupation: event.target.value })}
                      className={fieldControlClass}
                    >
                      {OCCUPATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={fieldWrapperClass}>
                    <span>Monthly Income / ماہانہ آمدن *</span>
                    <select
                      value={sibling.monthlyIncomeOrFee}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { monthlyIncomeOrFee: event.target.value })}
                      className={fieldControlClass}
                    >
                      {MONTHLY_INCOME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={fieldWrapperClass}>
                    <span>Marital Status / ازدواجی حیثیت *</span>
                    <select
                      value={sibling.maritalStatus}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { maritalStatus: event.target.value })}
                      className={fieldControlClass}
                    >
                      {MARITAL_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button type="button" onClick={() => removeArrayItem('siblings', index)} className="mt-4 min-h-11 w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 sm:w-auto">
                  Remove Sibling
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 8 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Orphan Health Information / صحت کی معلومات</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderSelectField('healthStatus', HEALTH_STATUS_OPTIONS, handleHealthStatusChange)}
            {formData.healthStatus === 'disabled' ? (
              <>
                {renderSelectField('disabilityType', DISABILITY_TYPE_OPTIONS)}
                {renderSelectField('disabilityCause', DISABILITY_CAUSE_OPTIONS)}
                {['accident', 'illness'].includes(formData.disabilityCause) ? renderTextareaField('disabilityCauseDetails') : null}
                {['accident', 'illness'].includes(formData.disabilityCause) ? renderTextField('disabilitySince', 'date') : null}
                {renderBooleanSelect('treatmentOngoing', (value) => handleTreatmentOngoingChange(value ? 'yes' : 'no'), 'Yes / ہاں', 'No / نہیں')}
                {formData.treatmentOngoing === 'yes' ? renderTextField('treatmentPlace') : null}
                {formData.treatmentOngoing === 'yes' ? renderTextField('monthlyMedicalExpenses', 'number') : null}
              </>
            ) : null}
            {formData.healthStatus === 'chronic_illness' ? (
              <>
                {renderSelectField('chronicDisease', DISEASE_OPTIONS)}
                {formData.chronicDisease === 'other' ? renderTextField('specifyDisease') : null}
                {renderTextField('illnessSince', 'date')}
                {renderTextField('treatmentPlace')}
                {renderTextField('monthlyMedicalExpenses', 'number')}
              </>
            ) : null}
          </div>
        </div>
      )}

      {step === 9 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Education & Skills / تعلیم اور ہنر</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderBooleanSelect('currentlyStudying', handleSchoolEnrollmentChange, 'Yes / ہاں', 'No / نہیں')}
            {renderBooleanSelect('enrolledInMadrasa', handleMadrasaChange, 'Yes / ہاں', 'No / نہیں')}
            {(!formData.currentlyStudying || !formData.enrolledInMadrasa) ? (
              <label className="flex min-h-12 items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-4 text-sm leading-6 text-amber-900 sm:col-span-2 sm:px-4">
                <input type="checkbox" checked={formData.educationUndertakingAccepted} onChange={(e) => updateField('educationUndertakingAccepted', e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
                <span className="min-w-0 break-words">تعلیمی اقرار نامہ: سرپرست اس بات سے اتفاق کرتا ہے کہ اگر بچہ کفالت پروگرام میں رجسٹر ہو گیا تو اس کی چھوٹی ہوئی اسکول یا مدرسہ تعلیم شروع کروائی جائے گی۔</span>
              </label>
            ) : null}
            {formData.currentlyStudying ? (
              <>
                {renderSelectField('currentClass', CLASS_OPTIONS)}
                {renderTextField('schoolName')}
                {renderTextField('schoolAddress')}
                {renderTextField('schoolDistanceKm', 'number')}
                {renderSelectField('schoolTransportMode', TRANSPORT_OPTIONS)}
                {renderSelectField('schoolStudyingSince', STUDYING_SINCE_YEAR_OPTIONS)}
              </>
            ) : null}
            {formData.enrolledInMadrasa ? (
              <>
                {renderTextField('madrasaName')}
                {renderTextField('madrasaEducationDetails')}
                {renderSelectField('educationStartCondition', ISLAMIC_STUDIES_OPTIONS)}
              </>
            ) : null}
            {(formData.currentlyStudying || formData.enrolledInMadrasa) ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:col-span-2">Mention fee only with valid fee voucher/proof. اگر واؤچر / ثبوت موجود نہ ہو تو فیس درج نہ کی جائے۔</div>
                {renderSelectField('educationFree', [{ value: '', label: 'Select fee status' }, { value: 'yes', label: 'Yes / ہاں' }, { value: 'no', label: 'No / نہیں' }], handleEducationFreeChange)}
                {formData.educationFree === 'no' ? renderTextField('monthlySchoolFee', 'number') : null}
                {formData.educationFree === 'no' ? (
                  <div className="sm:col-span-2">
                    <FileUpload
                      documentType="fee_voucher"
                      applicationId={applicationId}
                      ensureApplicationId={ensureDraftApplication}
                      onUpload={handleDocumentUpload}
                      onRemove={handleDocumentRemove}
                      existingDocument={documents.find((doc) => doc.documentType === 'fee_voucher')}
                      label="Fee Voucher / فیس واؤچر (Optional)"
                      accept="image/*,.pdf"
                    />
                  </div>
                ) : null}
              </>
            ) : null}
            {renderSelectField('currentSkillLearning', [{ value: '', label: 'Select skill learning status' }, { value: 'yes', label: 'Yes / ہاں' }, { value: 'no', label: 'No / نہیں' }])}
            {formData.currentSkillLearning === 'yes' ? renderSelectField('currentSkill', SKILL_OPTIONS) : null}
            {formData.currentSkillLearning === 'no' ? renderSelectField('technicalSkillInterest', [{ value: '', label: 'Interested in technical skill?' }, { value: 'yes', label: 'Yes / ہاں' }, { value: 'no', label: 'No / نہیں' }]) : null}
            {formData.currentSkillLearning === 'no' && formData.technicalSkillInterest === 'yes' ? renderSelectField('technicalSkill', SKILL_OPTIONS) : null}
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-900">{fieldLabel('childHobbies')}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {HOBBY_OPTIONS.map((option) => (
                  <label key={option.value} className="flex min-h-11 items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-5 sm:items-center">
                    <input type="checkbox" checked={formData.childHobbies.includes(option.value)} onChange={() => toggleMultiSelectValue('childHobbies', option.value)} className="mt-0.5 shrink-0 sm:mt-0" />
                    <span className="min-w-0 break-words">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 10 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Household Income & External Assistance / گھریلو آمدنی اور بیرونی امداد</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderTextField('totalFamilyMembers', 'number')}
            {renderSelectField('householdHasMonthlyIncome', [{ value: '', label: 'Select income status' }, { value: 'yes', label: 'Yes / ہاں' }, { value: 'no', label: 'No / نہیں' }], handleHouseholdIncomeChange)}
            {formData.householdHasMonthlyIncome === 'yes' ? renderTextField('householdEarnersCount', 'number') : null}
            {formData.householdHasMonthlyIncome === 'yes' ? renderSelectField('totalHouseholdIncome', MONTHLY_INCOME_OPTIONS) : null}
            {formData.householdHasMonthlyIncome === 'yes' ? renderSelectField('childEarnsIncome', [{ value: '', label: 'Does child earn?' }, { value: 'yes', label: 'Yes / ہاں' }, { value: 'no', label: 'No / نہیں' }], handleChildEarnsIncomeChange) : null}
            {formData.childEarnsIncome === 'yes' ? renderSelectField('childWorkNature', CHILD_WORK_OPTIONS) : null}
            {formData.childEarnsIncome === 'yes' ? renderSelectField('childMonthlyIncome', MONTHLY_INCOME_OPTIONS) : null}
            {renderBooleanSelect('receivingOtherAid', handleOtherAidChange)}
            {formData.receivingOtherAid ? (
              <>
                {renderSelectField('otherAidSource', ASSISTANCE_SOURCE_OPTIONS)}
                {renderTextField('monthlyAidAmount', 'number')}
              </>
            ) : (
              <>
                {renderSelectField('assistanceApplied', [{ value: '', label: 'Applied anywhere?' }, { value: 'yes', label: 'Yes / ہاں' }, { value: 'no', label: 'No / نہیں' }])}
                {formData.assistanceApplied === 'yes' ? renderTextField('assistanceAppliedWhere') : null}
              </>
            )}
          </div>
        </div>
      )}

      {step === 11 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Documents Upload / دستاویزات اپ لوڈ</h2>
            <p className="mt-1 text-sm text-slate-600">Choose the required documents. The draft is saved automatically before the first upload.</p>
          </div>
          {!applicationId ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900 sm:p-4">
              Selecting a file will save this application as a draft first, then upload the document.
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {documentTypes.map((documentType) => {
              const existingDocument = documents.find((doc) => doc.documentType === documentType.type);
              return (
                <FileUpload
                  key={documentType.type}
                  documentType={documentType.type}
                  applicationId={applicationId}
                  ensureApplicationId={ensureDraftApplication}
                  onUpload={handleDocumentUpload}
                  onRemove={handleDocumentRemove}
                  existingDocument={existingDocument}
                  label={documentType.label}
                  accept="image/*,.pdf"
                />
              );
            })}
          </div>
        </div>
      )}

      {step === 12 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Attestation/تصدیق</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600" dir="rtl">دو صفحات پر مشتمل تصدیقی فارم ڈاؤن لوڈ یا پرنٹ کریں۔ پہلے صفحے پر اسکول پرنسپل/ناظم اور امام مسجد سے تصدیق کروائیں، دوسرے صفحے پر اصول و ضوابط پڑھوا کر سرپرست کے دستخط/انگوٹھا لگوائیں، پھر مکمل فارم اپ لوڈ کریں۔</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">فارم ڈاؤن لوڈ / پرنٹ</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600" dir="rtl">
                فارم حاصل کرنے کے لیے ڈاؤن لوڈ یا پرنٹ کا بٹن استعمال کریں۔ مکمل دستخط اور مہر کے بعد یہی فارم اپ لوڈ کرنا لازمی ہے۔
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDownloadAttestation}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
                >
                  Download Form
                </button>
                <button
                  type="button"
                  onClick={handlePrintAttestation}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 sm:w-auto"
                >
                  Print Form
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">دستخط شدہ تصدیقی فارم اپ لوڈ کریں</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600" dir="rtl">اسکول، مسجد اور سرپرست کی تصدیق مکمل ہونے کے بعد اسکین شدہ PDF یا واضح تصویر اپ لوڈ کریں۔</p>
              {!applicationId ? (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900" dir="rtl">
                  فائل منتخب کرنے پر پہلے درخواست ڈرافٹ کے طور پر محفوظ ہوگی، پھر تصدیقی فارم اپ لوڈ ہوگا۔
                </div>
              ) : null}
              <div className="mt-4">
                <FileUpload
                  documentType={ATTESTATION_DOCUMENT_TYPE}
                  applicationId={applicationId}
                  ensureApplicationId={ensureDraftApplication}
                  onUpload={handleDocumentUpload}
                  onRemove={handleDocumentRemove}
                  existingDocument={documents.find((doc) => doc.documentType === ATTESTATION_DOCUMENT_TYPE)}
                  label="مکمل شدہ تصدیقی فارم"
                  accept="image/*,.pdf"
                />
              </div>
            </section>
          </div>
        </div>
      )}

      {step === 13 && (
        <div className="space-y-6">
          <div className="space-y-4">
            {reviewSections.map((section) => {
              const fields = section.fields.filter((field) => shouldShowField(field));
              if (fields.length === 0) return null;

              return (
                <section key={section.title} className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                  {section.title === 'GPS' && !formData.latitude && !formData.longitude ? (
                    <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      GPS was not captured. Address was entered manually.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {fields.map((field) => (
                        <div key={field} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-500">{fieldLabel(field)}</p>
                          <p className="mt-1 break-words text-sm text-slate-900">{formatReviewValue(field)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700 sm:p-4">
            <p className="font-semibold text-slate-900">Important</p>
            <p className="mt-2">A draft allows later editing. Submitting marks the form ready for review.</p>
          </div>
        </div>
      )}

      <div className="sticky bottom-[var(--mobile-nav-offset)] z-20 -mx-3 border-t border-slate-200 bg-white/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:static lg:mx-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none">
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="min-h-12 min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
          >
            Back
          </button>
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="min-h-12 min-w-0 rounded-lg bg-slate-900 px-2 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-5"
            >
              Next
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => submit('draft')}
            disabled={isSubmitting}
            className="min-h-12 min-w-0 rounded-lg bg-slate-600 px-2 py-3 text-sm font-semibold text-white transition hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
          >
            {submittingAction === 'draft' ? 'Saving…' : 'Save Draft'}
          </button>
          {step === TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => submit('submitted')}
              disabled={isSubmitting}
              className="min-h-12 min-w-0 rounded-lg bg-blue-600 px-2 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
            >
              {submittingAction === 'submitted' ? (
                'Submitting…'
              ) : (
                <>
                  <span className="sm:hidden">Submit</span>
                  <span className="hidden sm:inline">Submit Application</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
