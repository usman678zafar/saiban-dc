import { z } from 'zod';
import {
  isValidDistrictForProvince,
  isValidProvince,
  isValidTehsilForDistrict,
} from '@/lib/address-utils';

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

const optionalEnum = <T extends [string, ...string[]]>(values: T) => z.preprocess((value) => {
  if (typeof value === 'string') return value.trim() || undefined;
  return value;
}, z.enum(values).optional());

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
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().min(0).optional()),
  value: nonNegativeNumber.optional(),
});

const baseOrphanApplicationSchema = z.object({
  registrationNumber: optionalString,
  collectorId: optionalString,
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
  fatherTongue: optionalString,
  fatherNativeArea: optionalString,
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
  motherAlive: optionalEnum(['yes', 'separated', 'no']),
  motherSeparationReason: optionalString,
  motherEmploymentStatus: optionalEnum(['housewife', 'working', 'unemployed']),
  motherIsGuardian: optionalEnum(['yes', 'no']),
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
  guardianGender: optionalEnum(['male', 'female']),
  guardianCnic: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => value === '' || cnicRegex.test(value), {
    message: 'Guardian CNIC must contain 13 digits',
  }).optional(),
  guardianEducation: optionalString,
  guardianMotherTongue: optionalString,
  guardianNativeArea: optionalString,
  guardianContact: optionalString,
  guardianZakatStatus: optionalString,
  guardianOccupation: optionalString,
  guardianFamilyHolder: optionalEnum(['yes', 'no']),
  guardianFamilyHolderAmount: nonNegativeNumber.optional(),
  guardianFamilyMembersCount: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().positive().optional()),
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
  householdAssets: z.array(assetSchema).optional(),
  province: optionalString,
  city: optionalString,
  district: optionalString,
  tehsil: optionalString,
  residentialArea: optionalString,
  fullAddress: optionalString,
  longitude: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().gte(-180).lte(180).optional()),
  latitude: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().gte(-90).lte(90).optional()),
  gpsAccuracyMeters: nonNegativeNumber.optional(),
  gpsCapturedAt: parseDate.optional(),
  houseOwnershipStatus: optionalString,
  monthlyRent: nonNegativeNumber.optional(),
  rentPaidBy: optionalString,
  houseOwner: optionalString,
  houseCondition: optionalString,
  houseConditionRemarks: optionalString,
  furnishingCondition: optionalString,
  furnishingConditionRemarks: optionalString,
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

export const orphanApplicationSchema = baseOrphanApplicationSchema.superRefine((data, ctx) => {
  const isSubmitted = data.status === 'submitted';
  if (!isSubmitted) return;

  if (data.motherAlive === 'no') {
    if (!data.motherDeathDate) {
      ctx.addIssue({
        path: ['motherDeathDate'],
        code: z.ZodIssueCode.custom,
        message: 'Mother death date is required when mother is deceased',
      });
    }

    if (!data.motherDeathCause) {
      ctx.addIssue({
        path: ['motherDeathCause'],
        code: z.ZodIssueCode.custom,
        message: 'Mother death cause is required when mother is deceased',
      });
    }
  }

  if (data.motherAlive === 'separated' && !data.motherSeparationReason) {
    ctx.addIssue({
      path: ['motherSeparationReason'],
      code: z.ZodIssueCode.custom,
      message: 'Mother-child separation reason is required when mother is alive but separated',
    });
  }

  if ((data.motherAlive === 'yes' || data.motherAlive === 'separated') && !data.motherContact) {
    ctx.addIssue({
      path: ['motherContact'],
      code: z.ZodIssueCode.custom,
      message: 'Mother contact is required when mother is alive',
    });
  }

  const guardianDetailsNeeded = data.motherAlive !== 'yes' || data.motherIsGuardian !== 'yes';
  if (guardianDetailsNeeded) {
    if (!data.guardianName) {
      ctx.addIssue({
        path: ['guardianName'],
        code: z.ZodIssueCode.custom,
        message: 'Guardian name is required',
      });
    }

    if (!data.guardianRelationship) {
      ctx.addIssue({
        path: ['guardianRelationship'],
        code: z.ZodIssueCode.custom,
        message: 'Guardian relationship is required',
      });
    }

    if (!data.guardianContact) {
      ctx.addIssue({
        path: ['guardianContact'],
        code: z.ZodIssueCode.custom,
        message: 'Guardian contact is required',
      });
    }

    if (data.guardianFamilyHolder === 'yes' && data.guardianFamilyMembersCount === undefined) {
      ctx.addIssue({
        path: ['guardianFamilyMembersCount'],
        code: z.ZodIssueCode.custom,
        message: 'Number of family members is required when family holder is yes',
      });
    }
  }

  if ((data.houseOwnershipStatus === 'rent' || data.houseOwnershipStatus === 'rented') && data.monthlyRent === undefined) {
    ctx.addIssue({
      path: ['monthlyRent'],
      code: z.ZodIssueCode.custom,
      message: 'Monthly rent is required for rented house',
    });
  }

  if (!data.province) {
    ctx.addIssue({
      path: ['province'],
      code: z.ZodIssueCode.custom,
      message: 'Province is required',
    });
  } else if (!isValidProvince(data.province)) {
    ctx.addIssue({
      path: ['province'],
      code: z.ZodIssueCode.custom,
      message: 'Selected province is invalid',
    });
  }

  if (!data.district) {
    ctx.addIssue({
      path: ['district'],
      code: z.ZodIssueCode.custom,
      message: 'District is required',
    });
  } else if (data.province && !isValidDistrictForProvince(data.province, data.district)) {
    ctx.addIssue({
      path: ['district'],
      code: z.ZodIssueCode.custom,
      message: 'Selected district does not belong to the selected province',
    });
  }

  if (data.province && data.district && data.tehsil && !isValidTehsilForDistrict(data.province, data.district, data.tehsil)) {
    ctx.addIssue({
      path: ['tehsil'],
      code: z.ZodIssueCode.custom,
      message: 'Selected tehsil does not belong to the selected district',
    });
  }

  if (!data.city) {
    ctx.addIssue({
      path: ['city'],
      code: z.ZodIssueCode.custom,
      message: 'City/Town is required',
    });
  }

  if (!data.residentialArea && !data.fullAddress) {
    ctx.addIssue({
      path: ['fullAddress'],
      code: z.ZodIssueCode.custom,
      message: 'Residential area or full address is required',
    });
  }

  if (data.healthStatus === 'disabled' && !data.disabilityDetails) {
    ctx.addIssue({
      path: ['disabilityDetails'],
      code: z.ZodIssueCode.custom,
      message: 'Disability details are required',
    });
  }

  if (data.healthStatus === 'sick' && !data.treatmentPlace) {
    ctx.addIssue({
      path: ['treatmentPlace'],
      code: z.ZodIssueCode.custom,
      message: 'Treatment place is required when child is sick',
    });
  }

  if ((data.healthStatus === 'sick' || data.healthStatus === 'disabled') && data.monthlyMedicalExpenses === undefined) {
    ctx.addIssue({
      path: ['monthlyMedicalExpenses'],
      code: z.ZodIssueCode.custom,
      message: 'Monthly medical expenses are required when child is sick or disabled',
    });
  }

  if (data.currentlyStudying) {
    if (!data.schoolName) {
      ctx.addIssue({
        path: ['schoolName'],
        code: z.ZodIssueCode.custom,
        message: 'School name is required when currently studying',
      });
    }

    if (data.educationFeeStatus === 'paid' && data.monthlySchoolFee === undefined) {
      ctx.addIssue({
        path: ['monthlySchoolFee'],
        code: z.ZodIssueCode.custom,
        message: 'Monthly school fee is required when education fee is paid',
      });
    }
  }

  if (data.enrolledInMadrasa) {
    if (!data.madrasaName) {
      ctx.addIssue({
        path: ['madrasaName'],
        code: z.ZodIssueCode.custom,
        message: 'Madrasa name is required when enrolled in madrasa',
      });
    }

    if (!data.madrasaEducationDetails) {
      ctx.addIssue({
        path: ['madrasaEducationDetails'],
        code: z.ZodIssueCode.custom,
        message: 'Madrasa education details are required when enrolled in madrasa',
      });
    }
  }

  if (data.receivingOtherAid) {
    if (!data.otherAidSource) {
      ctx.addIssue({
        path: ['otherAidSource'],
        code: z.ZodIssueCode.custom,
        message: 'Other aid source is required when receiving other aid',
      });
    }

    if (data.monthlyAidAmount === undefined) {
      ctx.addIssue({
        path: ['monthlyAidAmount'],
        code: z.ZodIssueCode.custom,
        message: 'Monthly aid amount is required when receiving other aid',
      });
    }
  }

  if (data.householdAssets?.length) {
    data.householdAssets.forEach((asset, index) => {
      if (asset.value === undefined) {
        ctx.addIssue({
          path: ['householdAssets', index, 'value'],
          code: z.ZodIssueCode.custom,
          message: 'Value is required for each selected household asset',
        });
      }

      if (asset.assetType === 'gold' || asset.assetType === 'silver') {
        if (asset.quantity === undefined || asset.quantity <= 0) {
          ctx.addIssue({
            path: ['householdAssets', index, 'quantity'],
            code: z.ZodIssueCode.custom,
            message: 'Grams are required for gold and silver',
          });
        }
      }
    });
  }
});

export const getOrphanApplicationSchema = orphanApplicationSchema;
