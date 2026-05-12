import { z } from 'zod';

const cnicRegex = /^\d{13}$/;
const bFormRegex = /^(?:\d{13}|\d{15})$/;

const parseDate = z.preprocess((value) => {
  if (!value) return undefined;
  if (typeof value === 'string' || value instanceof Date) return new Date(value);
  return undefined;
}, z.date().optional());

const nonNegativeNumber = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') return Number(value);
  return value;
}, z.number().min(0).optional());

const optionalString = z.preprocess((value) => {
  if (typeof value === 'string') return value.trim() || undefined;
  return value;
}, z.string().optional());

const booleanString = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value === 'true' || value === '1';
  }
  return value;
}, z.boolean());

export const siblingSchema = z.object({
  name: optionalString,
  age: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().positive().optional()),
  occupation: optionalString,
  monthlyIncomeOrFee: nonNegativeNumber.optional(),
});

export const relativeSchema = z.object({
  relativeType: z.enum(['paternal_grandfather', 'maternal_grandfather', 'paternal_uncle', 'maternal_uncle']),
  name: optionalString,
  age: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().positive().optional()),
  occupation: optionalString,
  monthlyIncome: nonNegativeNumber.optional(),
});

export const assetSchema = z.object({
  assetType: z.string().min(1),
  quantity: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().min(0).optional()),
  value: nonNegativeNumber.optional(),
});

export const orphanApplicationSchema = z.object({
  registrationNumber: optionalString,
  collectorName: optionalString,
  collectorProject: optionalString,
  collectorCnic: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => value === '' || cnicRegex.test(value), {
    message: 'CNIC must contain 13 digits',
  }).optional(),
  collectorAddress: optionalString,
  collectorContact: optionalString,
  fatherName: optionalString,
  fatherDob: parseDate.optional().refine((date) => !date || date <= new Date(), {
    message: 'Father DOB cannot be in the future',
  }).optional(),
  fatherAge: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().nonnegative().optional()),
  fatherCnic: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => value === '' || cnicRegex.test(value), {
    message: 'Father CNIC must contain 13 digits',
  }).optional(),
  fatherEducation: optionalString,
  fatherOccupation: optionalString,
  fatherDateOfDeath: parseDate.optional().refine((date) => !date || date <= new Date(), {
    message: 'Death date cannot be in the future',
  }).optional(),
  fatherCauseOfDeath: optionalString,
  motherName: optionalString,
  motherDob: parseDate.optional().refine((date) => !date || date <= new Date(), {
    message: 'Mother DOB cannot be in the future',
  }).optional(),
  motherAge: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().nonnegative().optional()),
  motherCnic: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => value === '' || cnicRegex.test(value), {
    message: 'Mother CNIC must contain 13 digits',
  }).optional(),
  motherEducation: optionalString,
  motherTongue: optionalString,
  motherNativeArea: optionalString,
  motherContact: optionalString,
  motherIsHousewife: booleanString.optional(),
  motherOccupation: optionalString,
  motherMonthlyIncome: nonNegativeNumber.optional(),
  motherRemarried: booleanString.optional(),
  motherDeathDate: parseDate.optional().refine((date) => !date || date <= new Date(), {
    message: 'Mother death date cannot be in the future',
  }).optional(),
  motherDeathCause: optionalString,
  guardianName: optionalString,
  guardianRelationship: optionalString,
  guardianCnic: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => value === '' || cnicRegex.test(value), {
    message: 'Guardian CNIC must contain 13 digits',
  }).optional(),
  guardianEducation: optionalString,
  guardianMotherTongue: optionalString,
  guardianNativeArea: optionalString,
  guardianContact: optionalString,
  guardianZakatStatus: optionalString,
  guardianOccupation: optionalString,
  guardianMonthlyIncome: nonNegativeNumber.optional(),
  paternalGrandfatherName: optionalString,
  paternalGrandfatherAge: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().nonnegative().optional()),
  paternalGrandfatherOccupation: optionalString,
  paternalGrandfatherIncome: nonNegativeNumber.optional(),
  maternalGrandfatherName: optionalString,
  maternalGrandfatherAge: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().nonnegative().optional()),
  maternalGrandfatherOccupation: optionalString,
  maternalGrandfatherIncome: nonNegativeNumber.optional(),
  siblings: z.array(siblingSchema).optional(),
  relatives: z.array(relativeSchema).optional(),
  city: optionalString,
  district: optionalString,
  tehsil: optionalString,
  residentialArea: optionalString,
  fullAddress: optionalString,
  longitude: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().gte(-180).lte(180).optional()),
  latitude: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().gte(-90).lte(90).optional()),
  houseOwnershipStatus: optionalString,
  monthlyRent: nonNegativeNumber.optional(),
  houseOwner: optionalString,
  houseCondition: optionalString,
  furnishingCondition: optionalString,
  childName: optionalString,
  gender: optionalString,
  caste: optionalString,
  sect: optionalString,
  bFormNumber: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => value === '' || bFormRegex.test(value), {
    message: 'B-Form must contain 13 or 15 digits',
  }).optional(),
  dateOfBirth: parseDate.optional().refine((date) => !date || date <= new Date(), {
    message: 'Child DOB cannot be in the future',
  }).optional(),
  age: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().gte(0).lte(12).optional()),
  totalBrothers: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().min(0).optional()),
  totalSisters: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().min(0).optional()),
  registeredBrothers: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().min(0).optional()),
  registeredSisters: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().min(0).optional()),
  siblingsUnder12: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().min(0).optional()),
  childLivesWithMother: booleanString.optional(),
  livingSituationNotes: optionalString,
  healthStatus: optionalString,
  disabilityDetails: optionalString,
  treatmentPlace: optionalString,
  monthlyMedicalExpenses: nonNegativeNumber.optional(),
  currentlyStudying: booleanString.optional(),
  notStudyingReason: optionalString,
  educationStartCondition: optionalString,
  currentClass: optionalString,
  schoolName: optionalString,
  schoolAddress: optionalString,
  enrolledInMadrasa: booleanString.optional(),
  madrasaName: optionalString,
  madrasaEducationDetails: optionalString,
  educationFeeStatus: optionalString,
  monthlySchoolFee: nonNegativeNumber.optional(),
  careerGoal: optionalString,
  technicalInterest: optionalString,
  learningSkill: optionalString,
  childMonthlyIncome: nonNegativeNumber.optional(),
  householdEarnersCount: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().min(0).optional()),
  totalHouseholdIncome: nonNegativeNumber.optional(),
  receivingOtherAid: booleanString.optional(),
  otherAidSource: optionalString,
  monthlyAidAmount: nonNegativeNumber.optional(),
  notAppliedElsewhereReason: optionalString,
  principalName: optionalString,
  institutionName: optionalString,
  verifiedStudentName: optionalString,
  verifiedFatherName: optionalString,
  verifiedClass: optionalString,
  verifiedMonthlyFee: nonNegativeNumber.optional(),
  principalSignatureFileKey: optionalString,
  institutionStampFileKey: optionalString,
  imamName: optionalString,
  mosqueName: optionalString,
  neighborhoodCity: optionalString,
  imamMobile: optionalString,
  motherZakatStatus: optionalString,
  imamSignatureFileKey: optionalString,
  mosqueStampFileKey: optionalString,
  guardianSignatureFileKey: optionalString,
  termsAccepted: booleanString.optional(),
  termsAcceptedAt: parseDate.optional(),
  status: z.enum(['draft', 'submitted', 'needs_correction', 'validated', 'rejected', 'migrated']).optional(),
  migrationStatus: z.enum(['pending', 'validated', 'migrated', 'rejected']).optional(),
  mainSaibanId: optionalString,
  migrationErrors: optionalString,
});

export const getOrphanApplicationSchema = orphanApplicationSchema;
