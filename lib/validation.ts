import { z } from 'zod';
import {
  isValidProvince,
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
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === 'no_income') return 0;
    return Number(trimmed);
  }
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

const motherOccupationsWithoutIncome = [
  'Housewife',
  'Unemployed',
  'Widow Support / Charity Dependent',
  'Disabled / Unable to Work',
  'Retired',
];

function motherOccupationNeedsIncome(occupation?: string) {
  return Boolean(occupation) && !motherOccupationsWithoutIncome.some((value) => occupation === value || occupation?.startsWith(value));
}

export const siblingSchema = z.object({
  name: optionalString,
  relation: optionalEnum(['brother', 'sister']),
  dob: parseDate.optional().refine((date) => !date || date <= new Date(), {
    message: 'Sibling DOB cannot be in the future',
  }).optional(),
  age: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().positive().optional()),
  educationStatus: optionalString,
  currentlyStudying: optionalEnum(['yes', 'no']).transform((value) => {
    if (value === undefined) return undefined;
    return value === 'yes';
  }).optional(),
  occupation: optionalString,
  monthlyIncomeOrFee: nonNegativeNumber.optional(),
  maritalStatus: optionalEnum(['married', 'unmarried', 'widowed', 'divorced']),
});

export const relativeSchema = z.object({
  relativeType: z.enum(['paternal_grandfather', 'maternal_grandfather', 'paternal_uncle', 'maternal_uncle']),
  name: optionalString,
  age: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().positive().optional()),
  occupation: optionalString,
  occupationOther: optionalString,
  monthlyIncome: nonNegativeNumber.optional(),
  supportType: optionalString,
  supportTypeOther: optionalString,
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
  guardianDob: parseDate.optional().refine((date) => !date || date <= new Date(), {
    message: 'Guardian DOB cannot be in the future',
  }).optional(),
  guardianAge: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().nonnegative().optional()),
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
  relativeInformationDisclosed: booleanString.optional(),
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
  residenceStructureType: optionalEnum(['pakka', 'kacha', 'mixed']),
  residenceCategory: optionalEnum(['house', 'flat', 'camp', 'hut', 'shared_residence']),
  houseConditionRemarks: optionalString,
  electricityAvailable: booleanString.optional(),
  gasAvailable: booleanString.optional(),
  waterAvailable: booleanString.optional(),
  furnishingCondition: optionalString,
  furnishingConditionRemarks: optionalString,
  childName: optionalString,
  gender: optionalString,
  caste: optionalString,
  sect: optionalString,
  religion: optionalString,
  specifyReligion: optionalString,
  syedStatus: optionalString,
  nationality: optionalString,
  specifyNationality: optionalString,
  bFormNumber: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => value === '' || bFormRegex.test(value), {
    message: 'B-Form must contain 13 or 15 digits',
  }).optional(),
  dateOfBirth: parseDate.optional().refine((date) => !date || date <= new Date(), {
    message: 'Child DOB cannot be in the future',
  }).optional(),
  age: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().gte(0).lte(11).optional()),
  totalSiblings: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value);
    return value;
  }, z.number().int().min(0).optional()),
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
  disabilityType: optionalString,
  disabilityCause: optionalString,
  disabilityCauseDetails: optionalString,
  disabilitySince: optionalString,
  treatmentOngoing: optionalString,
  chronicDisease: optionalString,
  specifyDisease: optionalString,
  illnessSince: parseDate.optional(),
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
  schoolDistanceKm: nonNegativeNumber.optional(),
  schoolTransportMode: optionalString,
  schoolStudyingSince: parseDate.optional(),
  educationUndertakingAccepted: booleanString.optional(),
  educationFree: optionalString,
  currentSkillLearning: optionalString,
  currentSkill: optionalString,
  childHobbies: z.array(z.string()).optional().transform((value) => value?.join(',') ?? undefined),
  technicalSkillInterest: optionalString,
  technicalSkill: optionalString,
  totalFamilyMembers: z.preprocess((value) => typeof value === 'string' ? Number(value) : value, z.number().int().min(0).optional()),
  householdHasMonthlyIncome: optionalString,
  childEarnsIncome: optionalString,
  childWorkNature: optionalString,
  assistanceApplied: optionalString,
  assistanceAppliedWhere: optionalString,
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
  guardianSignatureFileKey: optionalString,
  termsAccepted: booleanString.optional(),
  termsAcceptedAt: parseDate.optional(),
  status: z.enum(['draft', 'submitted', 'needs_correction', 'supervisor_approved', 'reviewer_approved', 'admin_approved', 'validated', 'rejected', 'migrated']).optional(),
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

  if (data.motherAlive === 'yes' && !data.motherContact) {
    ctx.addIssue({
      path: ['motherContact'],
      code: z.ZodIssueCode.custom,
      message: 'Mother contact is required when mother is alive',
    });
  }

  if (!data.motherName) {
    ctx.addIssue({ path: ['motherName'], code: z.ZodIssueCode.custom, message: 'Mother name is required' });
  }

  if (!data.motherDob) {
    ctx.addIssue({ path: ['motherDob'], code: z.ZodIssueCode.custom, message: 'Mother DOB is required' });
  }

  if (data.motherAge === undefined) {
    ctx.addIssue({ path: ['motherAge'], code: z.ZodIssueCode.custom, message: 'Mother age is required' });
  }

  if (!data.motherCnic) {
    ctx.addIssue({ path: ['motherCnic'], code: z.ZodIssueCode.custom, message: 'Mother CNIC is required' });
  }

  if (!data.motherAlive) {
    ctx.addIssue({ path: ['motherAlive'], code: z.ZodIssueCode.custom, message: 'Mother living status is required' });
  }

  if (!data.motherEducation) {
    ctx.addIssue({ path: ['motherEducation'], code: z.ZodIssueCode.custom, message: 'Mother education is required' });
  }

  if (!data.motherTongue) {
    ctx.addIssue({ path: ['motherTongue'], code: z.ZodIssueCode.custom, message: 'Mother tongue is required' });
  }

  if (!data.motherNativeArea) {
    ctx.addIssue({ path: ['motherNativeArea'], code: z.ZodIssueCode.custom, message: 'Mother native area is required' });
  }

  if (data.motherAlive === 'yes' && !data.motherOccupation) {
    ctx.addIssue({ path: ['motherOccupation'], code: z.ZodIssueCode.custom, message: 'Mother occupation is required' });
  }

  if (data.motherAlive === 'yes' && motherOccupationNeedsIncome(data.motherOccupation) && data.motherMonthlyIncome === undefined) {
    ctx.addIssue({ path: ['motherMonthlyIncome'], code: z.ZodIssueCode.custom, message: 'Mother monthly income is required' });
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

    if (!data.guardianDob) {
      ctx.addIssue({
        path: ['guardianDob'],
        code: z.ZodIssueCode.custom,
        message: 'Guardian DOB is required',
      });
    }

    if (data.guardianAge === undefined) {
      ctx.addIssue({
        path: ['guardianAge'],
        code: z.ZodIssueCode.custom,
        message: 'Guardian age is required',
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

  if (data.nationality === 'Other' && !data.specifyNationality) {
    ctx.addIssue({
      path: ['specifyNationality'],
      code: z.ZodIssueCode.custom,
      message: 'Specify nationality is required when nationality is Other',
    });
  }

  if (data.religion === 'Other' && !data.specifyReligion) {
    ctx.addIssue({
      path: ['specifyReligion'],
      code: z.ZodIssueCode.custom,
      message: 'Specify religion is required when religion is Other',
    });
  }

  if (data.totalSiblings !== undefined && (data.siblings?.length ?? 0) !== data.totalSiblings) {
    ctx.addIssue({
      path: ['siblings'],
      code: z.ZodIssueCode.custom,
      message: 'Sibling entries must match total number of siblings',
    });
  }

  data.siblings?.forEach((sibling, index) => {
    if (!sibling.name) {
      ctx.addIssue({ path: ['siblings', index, 'name'], code: z.ZodIssueCode.custom, message: 'Sibling name is required' });
    }
    if (!sibling.relation) {
      ctx.addIssue({ path: ['siblings', index, 'relation'], code: z.ZodIssueCode.custom, message: 'Sibling relation is required' });
    }
    if (!sibling.dob) {
      ctx.addIssue({ path: ['siblings', index, 'dob'], code: z.ZodIssueCode.custom, message: 'Sibling DOB is required' });
    }
    if (sibling.age === undefined) {
      ctx.addIssue({ path: ['siblings', index, 'age'], code: z.ZodIssueCode.custom, message: 'Sibling age is required' });
    }
    if (!sibling.educationStatus) {
      ctx.addIssue({ path: ['siblings', index, 'educationStatus'], code: z.ZodIssueCode.custom, message: 'Sibling education status is required' });
    }
    if (sibling.currentlyStudying === undefined) {
      ctx.addIssue({ path: ['siblings', index, 'currentlyStudying'], code: z.ZodIssueCode.custom, message: 'Sibling studying status is required' });
    }
    if (!sibling.occupation) {
      ctx.addIssue({ path: ['siblings', index, 'occupation'], code: z.ZodIssueCode.custom, message: 'Sibling occupation is required' });
    }
    if (sibling.monthlyIncomeOrFee === undefined) {
      ctx.addIssue({ path: ['siblings', index, 'monthlyIncomeOrFee'], code: z.ZodIssueCode.custom, message: 'Sibling monthly income is required' });
    }
    if (!sibling.maritalStatus) {
      ctx.addIssue({ path: ['siblings', index, 'maritalStatus'], code: z.ZodIssueCode.custom, message: 'Sibling marital status is required' });
    }
  });

  if (data.healthStatus === 'chronic_illness' && !data.treatmentPlace) {
    ctx.addIssue({
      path: ['treatmentPlace'],
      code: z.ZodIssueCode.custom,
      message: 'Treatment place is required when child has a chronic illness',
    });
  }

  if ((data.healthStatus === 'chronic_illness' || data.healthStatus === 'disabled') && data.monthlyMedicalExpenses === undefined) {
    ctx.addIssue({
      path: ['monthlyMedicalExpenses'],
      code: z.ZodIssueCode.custom,
      message: 'Monthly medical expenses are required when child has a chronic illness or is disabled',
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

    if (!data.educationStartCondition) {
      ctx.addIssue({
        path: ['educationStartCondition'],
        code: z.ZodIssueCode.custom,
        message: 'Islamic studies level is required when enrolled in madrasa',
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

  if (data.relativeInformationDisclosed) {
    data.relatives?.forEach((relative, index) => {
      if (!relative.relativeType) {
        ctx.addIssue({
          path: ['relatives', index, 'relativeType'],
          code: z.ZodIssueCode.custom,
          message: 'Relative relationship is required',
        });
      }

      if (!relative.name) {
        ctx.addIssue({
          path: ['relatives', index, 'name'],
          code: z.ZodIssueCode.custom,
          message: 'Relative name is required',
        });
      }

      if (!relative.occupation) {
        ctx.addIssue({
          path: ['relatives', index, 'occupation'],
          code: z.ZodIssueCode.custom,
          message: 'Relative occupation is required',
        });
      }

      if (relative.occupation === 'Other' && !relative.occupationOther) {
        ctx.addIssue({
          path: ['relatives', index, 'occupationOther'],
          code: z.ZodIssueCode.custom,
          message: 'Specify occupation is required when occupation is Other',
        });
      }

      if (relative.monthlyIncome === undefined) {
        ctx.addIssue({
          path: ['relatives', index, 'monthlyIncome'],
          code: z.ZodIssueCode.custom,
          message: 'Relative monthly income is required',
        });
      }

      if (!relative.supportType) {
        ctx.addIssue({
          path: ['relatives', index, 'supportType'],
          code: z.ZodIssueCode.custom,
          message: 'Nature of support is required',
        });
      }

      if (relative.supportType === 'other' && !relative.supportTypeOther) {
        ctx.addIssue({
          path: ['relatives', index, 'supportTypeOther'],
          code: z.ZodIssueCode.custom,
          message: 'Specify support is required when nature of support is Other',
        });
      }
    });
  }
});

export const getOrphanApplicationSchema = orphanApplicationSchema;

