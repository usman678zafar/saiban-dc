import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const meaningfulScalarFields = [
  'fatherName', 'fatherDob', 'fatherAge', 'fatherCnic', 'fatherEducation', 'fatherTongue', 'fatherNativeArea', 'fatherOccupation', 'fatherDateOfDeath', 'fatherCauseOfDeath',
  'motherName', 'motherDob', 'motherAge', 'motherCnic', 'motherEducation', 'motherTongue', 'motherNativeArea', 'motherAlive', 'motherSeparationReason', 'motherEmploymentStatus',
  'motherIsGuardian', 'motherContact', 'motherOccupation', 'motherMonthlyIncome', 'motherRemarried', 'motherDeathDate', 'motherDeathCause', 'motherHealthStatus', 'motherDisabilityRemarks',
  'guardianName', 'guardianRelationship', 'guardianGender', 'guardianDob', 'guardianAge', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue', 'guardianNativeArea',
  'guardianContact', 'guardianZakatStatus', 'guardianOccupation', 'guardianFamilyHolder', 'guardianFamilyHolderAmount', 'guardianFamilyMembersCount', 'guardianMonthlyIncome',
  'guardianHealthStatus', 'guardianDisabilityRemarks',
  'paternalGrandfatherName', 'paternalGrandfatherAge', 'paternalGrandfatherOccupation', 'paternalGrandfatherIncome', 'maternalGrandfatherName', 'maternalGrandfatherAge',
  'maternalGrandfatherOccupation', 'maternalGrandfatherIncome', 'relativeInformationDisclosed',
  'province', 'city', 'district', 'tehsil', 'residentialArea', 'fullAddress', 'longitude', 'latitude', 'gpsAccuracyMeters', 'gpsCapturedAt',
  'houseOwnershipStatus', 'monthlyRent', 'rentPaidBy', 'houseOwner', 'houseCondition', 'residenceStructureType', 'residenceCategory', 'houseConditionRemarks',
  'electricityAvailable', 'gasAvailable', 'waterAvailable', 'furnishingCondition', 'furnishingConditionRemarks',
  'childName', 'gender', 'caste', 'sect', 'religion', 'specifyReligion', 'syedStatus', 'specifyNationality', 'bFormNumber', 'dateOfBirth', 'age',
  'totalSiblings', 'totalBrothers', 'totalSisters', 'registeredBrothers', 'registeredSisters', 'siblingsUnder12', 'childLivesWithMother', 'livingSituationNotes',
  'healthStatus', 'disabilityDetails', 'disabilityType', 'disabilityCause', 'disabilityCauseDetails', 'disabilitySince', 'treatmentOngoing', 'chronicDisease',
  'specifyDisease', 'illnessSince', 'treatmentPlace', 'monthlyMedicalExpenses',
  'currentlyStudying', 'notStudyingReason', 'educationStartCondition', 'currentClass', 'schoolName', 'schoolAddress', 'enrolledInMadrasa', 'madrasaName',
  'madrasaEducationDetails', 'educationFeeStatus', 'monthlySchoolFee', 'schoolDistanceKm', 'schoolTransportMode', 'schoolStudyingSince', 'educationUndertakingAccepted',
  'educationFree', 'currentSkillLearning', 'currentSkill', 'childHobbies', 'technicalSkillInterest', 'technicalSkill',
  'totalFamilyMembers', 'householdHasMonthlyIncome', 'childEarnsIncome', 'childWorkNature', 'assistanceApplied', 'assistanceAppliedWhere', 'careerGoal',
  'technicalInterest', 'learningSkill', 'childMonthlyIncome', 'householdEarnersCount', 'totalHouseholdIncome', 'receivingOtherAid', 'otherAidSource',
  'monthlyAidAmount', 'notAppliedElsewhereReason',
  'principalName', 'institutionName', 'verifiedStudentName', 'verifiedFatherName', 'verifiedClass', 'verifiedMonthlyFee',
  'imamName', 'mosqueName', 'neighborhoodCity', 'imamMobile', 'motherZakatStatus',
];

const siblingFields = ['name', 'relation', 'dob', 'age', 'educationStatus', 'currentlyStudying', 'occupation', 'monthlyIncomeOrFee', 'maritalStatus', 'healthStatus', 'disabilityRemarks'];
const relativeFields = ['relativeType', 'name', 'age', 'occupation', 'occupationOther', 'monthlyIncome', 'supportType', 'supportTypeOther'];
const householdAssetFields = ['assetType', 'quantity', 'value'];
const limits = {
  siblings: 24,
  relatives: 16,
  householdAssets: 16,
  documents: 12,
};
const totalMeaningfulFields = meaningfulScalarFields.length + limits.siblings + limits.relatives + limits.householdAssets + limits.documents;

function isFilled(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value === true;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function countNested(rows, fields, limit) {
  if (!Array.isArray(rows)) return 0;
  const filled = rows.reduce((count, row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return count;
    return count + fields.filter((field) => isFilled(row[field])).length;
  }, 0);
  return Math.min(filled, limit);
}

function calculate(application) {
  const documentTypes = new Set(application.documents.map((document) => document.documentType).filter(Boolean));
  const filledFieldsCount = meaningfulScalarFields.filter((field) => isFilled(application[field])).length
    + countNested(application.siblings, siblingFields, limits.siblings)
    + countNested(application.relatives, relativeFields, limits.relatives)
    + countNested(application.householdAssets, householdAssetFields, limits.householdAssets)
    + Math.min(documentTypes.size, limits.documents);

  return {
    filledFieldsCount,
    totalMeaningfulFields,
    filledFieldsPercentage: Math.min(100, Math.round((filledFieldsCount / totalMeaningfulFields) * 100)),
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
    ? `${changed} applications would be updated. Run npm run backfill:completion -- --confirm to write changes.`
    : `${changed} applications updated.`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
