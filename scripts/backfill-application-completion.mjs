import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const motherOccupationsWithoutIncome = [
  'Housewife',
  'Unemployed',
  'Widow Support / Charity Dependent',
  'Disabled / Unable to Work',
  'Retired',
];

const householdAssetKeys = [
  'fridge',
  'sewing_machine',
  'furniture',
  'vehicle',
  'livestock',
  'property',
  'smartphone',
  'cash_savings',
  'business_inventory',
  'gold',
  'silver',
  'other',
];

const assetAliases = new Map(householdAssetKeys.map((key) => [key, key]));
const assetKeysUsingGrams = new Set(['gold', 'silver']);

function text(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isFilled(value) {
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return text(value) !== '';
}

function boolValue(value) {
  return value === true || value === 'yes';
}

function motherOccupationNeedsIncome(occupation) {
  const value = text(occupation);
  return Boolean(value) && !motherOccupationsWithoutIncome.some((option) => value === option || value.startsWith(option));
}

function guardianDetailsNeeded(application) {
  return application.motherAlive !== 'yes' || application.motherIsGuardian !== 'yes';
}

function hasDocument(documents, documentType) {
  return documents.some((document) => document.documentType === documentType);
}

function documentTypesFor(application) {
  const types = ['child_photo', 'child_b_form', 'father_death_certificate'];

  if (application.motherAlive === 'no') {
    types.push('mother_death_certificate');
  }

  if (application.healthStatus === 'chronic_illness' || application.healthStatus === 'disabled') {
    types.push('medical_report');
  }

  if ((boolValue(application.currentlyStudying) || boolValue(application.enrolledInMadrasa)) && application.educationFree === 'no') {
    types.push('fee_voucher');
  }

  return types;
}

function cnicDocumentGroupsFor(application) {
  const groups = [
    {
      combinedType: 'father_cnic',
      frontType: 'father_cnic_front',
      backType: 'father_cnic_back',
      required: false,
    },
  ];

  if (application.motherAlive !== 'no') {
    groups.push({
      combinedType: 'mother_cnic',
      frontType: 'mother_cnic_front',
      backType: 'mother_cnic_back',
      required: true,
    });
  }

  if (guardianDetailsNeeded(application)) {
    groups.push({
      combinedType: 'guardian_cnic',
      frontType: 'guardian_cnic_front',
      backType: 'guardian_cnic_back',
      required: true,
    });
  }

  return groups;
}

function isCnicGroupComplete(group, documents) {
  const hasCombined = hasDocument(documents, group.combinedType);
  const hasBothSides = hasDocument(documents, group.frontType) && hasDocument(documents, group.backType);
  if (hasCombined || hasBothSides) return true;
  return !group.required && !hasDocument(documents, group.frontType) && !hasDocument(documents, group.backType);
}

function hasCompleteAttestation(documents) {
  return hasDocument(documents, 'attestation_confirmation')
    || (hasDocument(documents, 'attestation_page_1') && hasDocument(documents, 'attestation_page_2'));
}

function resolveAssetKey(raw) {
  const value = text(raw).toLowerCase();
  if (value.startsWith('no:')) {
    const noKey = value.slice(3);
    return householdAssetKeys.includes(noKey) && noKey !== 'other' ? noKey : null;
  }
  return assetAliases.get(value) ?? null;
}

function householdAssetSelectionFor(application) {
  const selection = Object.fromEntries(
    householdAssetKeys.map((key) => [key, { has: false, answered: false, value: '', grams: '' }]),
  );

  for (const row of application.householdAssets ?? []) {
    const rawType = text(row.assetType);
    const lowerType = rawType.toLowerCase();
    if (lowerType.startsWith('no:')) {
      const key = lowerType.slice(3);
      if (selection[key] && key !== 'other') {
        selection[key].answered = true;
      }
      continue;
    }

    const key = resolveAssetKey(rawType);
    if (!key) continue;
    selection[key].has = true;
    selection[key].answered = true;
    if (row.value !== null && row.value !== undefined && row.value !== '') {
      selection[key].value = String(row.value);
    }
    if (assetKeysUsingGrams.has(key) && row.quantity !== null && row.quantity !== undefined && row.quantity !== '') {
      selection[key].grams = String(row.quantity);
    } else if (!assetKeysUsingGrams.has(key) && !selection[key].value && row.quantity !== null && row.quantity !== undefined && row.quantity !== '') {
      selection[key].value = String(row.quantity);
    }
  }

  const appearsPastAssetStep = Boolean(
    application.childName
      || application.bFormNumber
      || application.dateOfBirth
      || application.healthStatus
      || application.householdHasMonthlyIncome
      || (application.siblings ?? []).length,
  );

  if ((application.status && application.status !== 'draft') || appearsPastAssetStep) {
    for (const key of householdAssetKeys) {
      if (key !== 'other' && !selection[key].answered) {
        selection[key].answered = true;
      }
    }
  }

  return selection;
}

function completionItem(complete) {
  return { complete };
}

function requiredFieldItems(application, fields) {
  return fields.map((field) => completionItem(isFilled(application[field])));
}

function getStepCompletionItems(application, stepNumber) {
  const documents = application.documents ?? [];

  switch (stepNumber) {
    case 1:
      return requiredFieldItems(application, ['fatherName', 'fatherDob', 'fatherCnic', 'fatherEducation', 'fatherTongue', 'fatherNativeArea', 'fatherOccupation', 'fatherDateOfDeath', 'fatherCauseOfDeath']);
    case 2: {
      const fields = ['motherName', 'motherDob', 'motherAlive', 'motherCnic', 'motherEducation', 'motherTongue', 'motherNativeArea', 'motherHealthStatus'];
      if (application.motherAlive === 'no') fields.push('motherDeathDate', 'motherDeathCause');
      if (application.motherAlive === 'separated') fields.push('motherSeparationReason');
      if (application.motherAlive === 'yes') {
        fields.push('motherContact', 'motherOccupation');
        if (motherOccupationNeedsIncome(application.motherOccupation)) fields.push('motherMonthlyIncome');
      }
      if (application.motherHealthStatus === 'disabled') fields.push('motherDisabilityRemarks');
      return requiredFieldItems(application, fields);
    }
    case 3: {
      if (!guardianDetailsNeeded(application)) return [completionItem(true)];
      const fields = ['guardianName', 'guardianDob', 'guardianAge', 'guardianRelationship', 'guardianGender', 'guardianCnic', 'guardianContact', 'guardianMonthlyIncome', 'guardianHealthStatus'];
      if (application.guardianFamilyHolder === 'yes') fields.push('guardianFamilyMembersCount');
      if (application.guardianHealthStatus === 'disabled') fields.push('guardianDisabilityRemarks');
      return requiredFieldItems(application, fields);
    }
    case 4: {
      const disclosed = application.relativeInformationDisclosed;
      const items = [completionItem(disclosed === true || disclosed === false)];
      if (disclosed === true) {
        const relatives = application.relatives ?? [];
        items.push(completionItem(relatives.length > 0));
        relatives.forEach((relative) => {
          items.push(completionItem(isFilled(relative.name)));
          items.push(completionItem(isFilled(relative.occupation)));
          if (relative.occupation === 'Other') items.push(completionItem(isFilled(relative.occupationOther)));
          items.push(completionItem(isFilled(relative.monthlyIncome)));
          items.push(completionItem(isFilled(relative.supportType)));
          if (relative.supportType === 'other') items.push(completionItem(isFilled(relative.supportTypeOther)));
        });
      }
      return items;
    }
    case 5: {
      const fields = ['province', 'district', 'city', 'houseOwnershipStatus', 'houseCondition', 'residenceStructureType', 'residenceCategory', 'furnishingCondition'];
      if (application.houseOwnershipStatus === 'rent' || application.houseOwnershipStatus === 'rented') fields.push('monthlyRent', 'rentPaidBy');
      return [
        ...requiredFieldItems(application, fields),
        completionItem(isFilled(application.residentialArea) || isFilled(application.fullAddress)),
      ];
    }
    case 6: {
      const selection = householdAssetSelectionFor(application);
      const items = householdAssetKeys
        .filter((key) => key !== 'other')
        .map((key) => completionItem(Boolean(selection[key].answered)));

      householdAssetKeys
        .filter((key) => key !== 'other' && selection[key].answered && selection[key].has)
        .forEach((key) => {
          items.push(completionItem(isFilled(selection[key].value)));
          if (assetKeysUsingGrams.has(key)) items.push(completionItem(isFilled(selection[key].grams)));
        });

      return items;
    }
    case 7: {
      const items = requiredFieldItems(application, ['childName', 'gender', 'religion', 'syedStatus', 'nationality', 'bFormNumber', 'dateOfBirth', 'totalSiblings']);
      if (application.religion === 'Other') items.push(completionItem(isFilled(application.specifyReligion)));
      if (application.nationality === 'Other') items.push(completionItem(isFilled(application.specifyNationality)));
      const totalSiblings = Number(application.totalSiblings || 0);
      const siblings = application.siblings ?? [];
      if (totalSiblings > 0) {
        items.push(completionItem(siblings.length === totalSiblings));
        siblings.forEach((sibling) => {
          items.push(completionItem(isFilled(sibling.name)));
          items.push(completionItem(isFilled(sibling.relation)));
          items.push(completionItem(isFilled(sibling.dob)));
          items.push(completionItem(isFilled(sibling.educationStatus)));
          items.push(completionItem(isFilled(sibling.currentlyStudying)));
          items.push(completionItem(isFilled(sibling.occupation)));
          items.push(completionItem(isFilled(sibling.monthlyIncomeOrFee)));
          items.push(completionItem(isFilled(sibling.maritalStatus)));
          items.push(completionItem(isFilled(sibling.healthStatus)));
          if (sibling.healthStatus === 'disabled') {
            items.push(completionItem(isFilled(sibling.disabilityRemarks)));
          }
        });
      }
      return items;
    }
    case 8: {
      const fields = ['healthStatus'];
      if (application.healthStatus === 'disabled') {
        fields.push('disabilityType', 'disabilityCause', 'disabilityDetails', 'treatmentOngoing', 'monthlyMedicalExpenses');
        if (application.treatmentOngoing === 'yes') fields.push('treatmentPlace');
      }
      if (application.healthStatus === 'chronic_illness') fields.push('chronicDisease', 'treatmentPlace', 'monthlyMedicalExpenses');
      return requiredFieldItems(application, fields);
    }
    case 9: {
      const fields = ['currentlyStudying', 'enrolledInMadrasa', 'currentSkillLearning'];
      if (boolValue(application.currentlyStudying)) fields.push('currentClass', 'schoolName', 'schoolAddress', 'schoolDistanceKm', 'schoolTransportMode', 'schoolStudyingSince');
      if (boolValue(application.enrolledInMadrasa)) fields.push('madrasaName', 'madrasaEducationDetails', 'educationStartCondition');
      if (boolValue(application.currentlyStudying) || boolValue(application.enrolledInMadrasa)) {
        if (application.educationFree === 'no') fields.push('monthlySchoolFee');
      }
      if (application.currentSkillLearning === 'yes') fields.push('currentSkill');
      if (application.currentSkillLearning === 'no') {
        fields.push('technicalSkillInterest');
        if (application.technicalSkillInterest === 'yes') fields.push('technicalSkill');
      }
      return [
        ...requiredFieldItems(application, fields),
        ...((boolValue(application.currentlyStudying) || boolValue(application.enrolledInMadrasa)) && application.educationFree === 'no'
          ? [completionItem(hasDocument(documents, 'fee_voucher'))]
          : []),
      ];
    }
    case 10: {
      const fields = ['totalFamilyMembers', 'householdHasMonthlyIncome', 'receivingOtherAid'];
      if (application.householdHasMonthlyIncome === 'yes') {
        fields.push('householdEarnersCount', 'totalHouseholdIncome', 'childEarnsIncome');
        if (application.childEarnsIncome === 'yes') fields.push('childWorkNature', 'childMonthlyIncome');
      }
      if (boolValue(application.receivingOtherAid)) {
        fields.push('otherAidSource', 'monthlyAidAmount');
      } else {
        fields.push('assistanceApplied');
        if (application.assistanceApplied === 'yes') fields.push('assistanceAppliedWhere');
      }
      return requiredFieldItems(application, fields);
    }
    case 11:
      return [completionItem(hasCompleteAttestation(documents))];
    case 12:
      return [
        ...documentTypesFor(application).map((documentType) => completionItem(hasDocument(documents, documentType))),
        ...cnicDocumentGroupsFor(application).map((group) => completionItem(isCnicGroupComplete(group, documents))),
      ];
    default:
      return [];
  }
}

function calculate(application) {
  const items = Array.from({ length: 12 }, (_, index) => getStepCompletionItems(application, index + 1)).flat();
  const total = items.length;
  const complete = items.filter((item) => item.complete).length;

  return {
    filledFieldsCount: complete,
    totalMeaningfulFields: total,
    filledFieldsPercentage: total === 0 ? 0 : Math.round((complete / total) * 100),
  };
}

const dryRun = !process.argv.includes('--confirm');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const applications = await prisma.orphanApplication.findMany({
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
      documents: {
        select: {
          documentType: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  console.log(`${dryRun ? 'Dry run:' : 'Backfill:'} ${applications.length} applications found.`);

  let changed = 0;
  for (const application of applications) {
    const metrics = calculate(application);
    const isChanged = application.filledFieldsCount !== metrics.filledFieldsCount
      || application.totalMeaningfulFields !== metrics.totalMeaningfulFields
      || application.filledFieldsPercentage !== metrics.filledFieldsPercentage;

    if (!isChanged) continue;
    changed += 1;

    if (dryRun) {
      console.log(`${application.id}: ${application.filledFieldsPercentage}% -> ${metrics.filledFieldsPercentage}% (${metrics.filledFieldsCount}/${metrics.totalMeaningfulFields})`);
      continue;
    }

    await prisma.$executeRaw`
      UPDATE "OrphanApplication"
      SET
        "filledFieldsCount" = ${metrics.filledFieldsCount},
        "totalMeaningfulFields" = ${metrics.totalMeaningfulFields},
        "filledFieldsPercentage" = ${metrics.filledFieldsPercentage},
        "updatedAt" = ${application.updatedAt}
      WHERE "id" = ${application.id}
    `;
  }

  console.log(dryRun
    ? `${changed} applications would be updated. Run npm run backfill:completion:apply to write changes.`
    : `${changed} applications updated.`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
