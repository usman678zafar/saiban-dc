import type { FormData } from '@/components/orphan-application-wizard';
import { HOUSEHOLD_ASSET_KEYS, householdAssetRowsToOtherItems, householdAssetRowsToSelection } from '@/lib/household-assets';
import type { ApplicationDocumentView } from '@/lib/application-documents';

function dateOnly(value: unknown) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : '';
}

function dateTime(value: unknown) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : '';
}

function stringValue(value: unknown, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

export function applicationToWizardData(application: any): Partial<FormData> {
  const householdAssets = application.householdAssets ?? [];
  const householdAssetSelection = householdAssetRowsToSelection(householdAssets);
  const appearsPastAssetStep = Boolean(
    application.childName ||
    application.bFormNumber ||
    application.dateOfBirth ||
    application.healthStatus ||
    application.householdHasMonthlyIncome ||
    (application.siblings ?? []).length,
  );
  if ((application.status && application.status !== 'draft') || appearsPastAssetStep) {
    for (const key of HOUSEHOLD_ASSET_KEYS) {
      if (key !== 'other' && !householdAssetSelection[key].answered) {
        householdAssetSelection[key].answered = true;
      }
    }
  }

  return {
    registrationNumber: application.registrationNumber ?? '',
    collectorId: application.collectorId ?? '',
    collectorName: application.collectorName ?? '',
    collectorProject: application.collectorProject ?? '',
    collectorCnic: application.collectorCnic ?? '',
    collectorAddress: application.collectorAddress ?? '',
    collectorContact: application.collectorContact ?? '',
    childName: application.childName ?? '',
    gender: application.gender ?? '',
    caste: application.caste ?? '',
    sect: application.sect ?? '',
    religion: application.religion ?? '',
    specifyReligion: application.specifyReligion ?? '',
    syedStatus: application.syedStatus ?? '',
    nationality: application.nationality ?? 'Pakistani',
    specifyNationality: application.specifyNationality ?? '',
    dateOfBirth: dateOnly(application.dateOfBirth),
    bFormNumber: application.bFormNumber ?? '',
    city: application.city ?? '',
    fatherName: application.fatherName ?? '',
    fatherDob: dateOnly(application.fatherDob),
    fatherAge: stringValue(application.fatherAge),
    fatherCnic: application.fatherCnic ?? '',
    fatherEducation: application.fatherEducation ?? '',
    fatherTongue: application.fatherTongue ?? '',
    fatherNativeArea: application.fatherNativeArea ?? '',
    fatherOccupation: application.fatherOccupation ?? '',
    fatherDateOfDeath: dateOnly(application.fatherDateOfDeath),
    fatherCauseOfDeath: application.fatherCauseOfDeath ?? '',
    motherName: application.motherName ?? '',
    motherDob: dateOnly(application.motherDob),
    motherAge: stringValue(application.motherAge),
    motherCnic: application.motherCnic ?? '',
    motherEducation: application.motherEducation ?? '',
    motherTongue: application.motherTongue ?? '',
    motherNativeArea: application.motherNativeArea ?? '',
    motherAlive: application.motherAlive ?? '',
    motherSeparationReason: application.motherSeparationReason ?? '',
    motherEmploymentStatus: application.motherEmploymentStatus ?? '',
    motherIsGuardian: application.motherIsGuardian ?? '',
    motherContact: application.motherContact ?? '',
    motherIsHousewife: application.motherIsHousewife ?? false,
    motherOccupation: application.motherOccupation ?? '',
    motherMonthlyIncome: stringValue(application.motherMonthlyIncome),
    motherRemarried: application.motherRemarried ?? false,
    motherDeathDate: dateOnly(application.motherDeathDate),
    motherDeathCause: application.motherDeathCause ?? '',
    guardianName: application.guardianName ?? '',
    guardianRelationship: application.guardianRelationship ?? '',
    guardianGender: application.guardianGender ?? '',
    guardianCnic: application.guardianCnic ?? '',
    guardianEducation: application.guardianEducation ?? '',
    guardianMotherTongue: application.guardianMotherTongue ?? '',
    guardianNativeArea: application.guardianNativeArea ?? '',
    guardianContact: application.guardianContact ?? '',
    guardianZakatStatus: application.guardianZakatStatus ?? '',
    guardianOccupation: application.guardianOccupation ?? '',
    guardianFamilyHolder: application.guardianFamilyHolder ?? '',
    guardianFamilyHolderAmount: stringValue(application.guardianFamilyHolderAmount),
    guardianFamilyMembersCount: stringValue(application.guardianFamilyMembersCount),
    guardianMonthlyIncome: stringValue(application.guardianMonthlyIncome),
    guardianSignatureFileKey: application.guardianSignatureFileKey ?? '',
    paternalGrandfatherName: application.paternalGrandfatherName ?? '',
    paternalGrandfatherAge: stringValue(application.paternalGrandfatherAge),
    paternalGrandfatherOccupation: application.paternalGrandfatherOccupation ?? '',
    paternalGrandfatherIncome: stringValue(application.paternalGrandfatherIncome),
    maternalGrandfatherName: application.maternalGrandfatherName ?? '',
    maternalGrandfatherAge: stringValue(application.maternalGrandfatherAge),
    maternalGrandfatherOccupation: application.maternalGrandfatherOccupation ?? '',
    maternalGrandfatherIncome: stringValue(application.maternalGrandfatherIncome),
    relativeInformationDisclosed: application.relativeInformationDisclosed === true ? 'yes' : application.relativeInformationDisclosed === false ? 'no' : '',
    province: application.province ?? '',
    district: application.district ?? '',
    tehsil: application.tehsil ?? '',
    residentialArea: application.residentialArea ?? '',
    fullAddress: application.fullAddress ?? '',
    latitude: stringValue(application.latitude),
    longitude: stringValue(application.longitude),
    gpsAccuracyMeters: stringValue(application.gpsAccuracyMeters),
    gpsCapturedAt: dateTime(application.gpsCapturedAt),
    houseOwnershipStatus: application.houseOwnershipStatus === 'rented'
      ? 'rent'
      : application.houseOwnershipStatus || (application.monthlyRent != null || application.rentPaidBy ? 'rent' : ''),
    monthlyRent: stringValue(application.monthlyRent),
    rentPaidBy: application.rentPaidBy ?? '',
    houseOwner: application.houseOwner ?? '',
    houseCondition: application.houseCondition ?? '',
    residenceStructureType: application.residenceStructureType ?? '',
    residenceCategory: application.residenceCategory ?? '',
    houseConditionRemarks: application.houseConditionRemarks ?? '',
    electricityAvailable: application.electricityAvailable ?? false,
    gasAvailable: application.gasAvailable ?? false,
    waterAvailable: application.waterAvailable ?? false,
    furnishingCondition: application.furnishingCondition ?? '',
    furnishingConditionRemarks: application.furnishingConditionRemarks ?? '',
    age: stringValue(application.age),
    totalBrothers: stringValue(application.totalBrothers),
    totalSisters: stringValue(application.totalSisters),
    registeredBrothers: stringValue(application.registeredBrothers),
    registeredSisters: stringValue(application.registeredSisters),
    siblingsUnder12: stringValue(application.siblingsUnder12),
    childLivesWithMother: application.childLivesWithMother ?? false,
    livingSituationNotes: application.livingSituationNotes ?? '',
    healthStatus: application.healthStatus ?? '',
    disabilityDetails: application.disabilityDetails ?? '',
    disabilityType: application.disabilityType ?? '',
    disabilityCause: application.disabilityCause ?? '',
    disabilityCauseDetails: application.disabilityCauseDetails ?? '',
    disabilitySince: application.disabilitySince ?? '',
    treatmentOngoing: application.treatmentOngoing ?? '',
    chronicDisease: application.chronicDisease ?? '',
    specifyDisease: application.specifyDisease ?? '',
    illnessSince: dateOnly(application.illnessSince),
    treatmentPlace: application.treatmentPlace ?? '',
    currentlyStudying: application.currentlyStudying ?? false,
    notStudyingReason: application.notStudyingReason ?? '',
    educationStartCondition: application.educationStartCondition ?? '',
    currentClass: application.currentClass ?? '',
    schoolName: application.schoolName ?? '',
    schoolAddress: application.schoolAddress ?? '',
    enrolledInMadrasa: application.enrolledInMadrasa ?? false,
    madrasaName: application.madrasaName ?? '',
    madrasaEducationDetails: application.madrasaEducationDetails ?? '',
    educationFeeStatus: application.educationFeeStatus ?? '',
    monthlySchoolFee: stringValue(application.monthlySchoolFee),
    schoolDistanceKm: stringValue(application.schoolDistanceKm),
    schoolTransportMode: application.schoolTransportMode ?? '',
    schoolStudyingSince: dateOnly(application.schoolStudyingSince),
    educationUndertakingAccepted: application.educationUndertakingAccepted ?? false,
    educationFree: application.educationFree ?? '',
    currentSkillLearning: application.currentSkillLearning ?? '',
    currentSkill: application.currentSkill ?? '',
    childHobbies: application.childHobbies ? String(application.childHobbies).split(',').filter(Boolean) : [],
    technicalSkillInterest: application.technicalSkillInterest ?? '',
    technicalSkill: application.technicalSkill ?? '',
    careerGoal: application.careerGoal ?? '',
    technicalInterest: application.technicalInterest ?? '',
    learningSkill: application.learningSkill ?? '',
    totalFamilyMembers: stringValue(application.totalFamilyMembers),
    householdHasMonthlyIncome: application.householdHasMonthlyIncome ?? '',
    householdEarnersCount: stringValue(application.householdEarnersCount),
    totalHouseholdIncome: stringValue(application.totalHouseholdIncome),
    childEarnsIncome: application.childEarnsIncome ?? '',
    childWorkNature: application.childWorkNature ?? '',
    childMonthlyIncome: stringValue(application.childMonthlyIncome),
    assistanceApplied: application.assistanceApplied ?? '',
    assistanceAppliedWhere: application.assistanceAppliedWhere ?? '',
    receivingOtherAid: application.receivingOtherAid ?? false,
    otherAidSource: application.otherAidSource ?? '',
    monthlyAidAmount: stringValue(application.monthlyAidAmount),
    notAppliedElsewhereReason: application.notAppliedElsewhereReason ?? '',
    siblings: (application.siblings ?? []).map((sibling: any) => ({
      name: sibling.name ?? '',
      relation: sibling.relation ?? 'brother',
      dob: dateOnly(sibling.dob),
      age: stringValue(sibling.age),
      educationStatus: sibling.educationStatus ?? '',
      currentlyStudying: sibling.currentlyStudying === true ? 'yes' : sibling.currentlyStudying === false ? 'no' : '',
      occupation: sibling.occupation ?? '',
      monthlyIncomeOrFee: stringValue(sibling.monthlyIncomeOrFee),
      maritalStatus: sibling.maritalStatus ?? '',
    })),
    totalSiblings: application.totalSiblings !== null && application.totalSiblings !== undefined
      ? stringValue(application.totalSiblings)
      : ((application.siblings ?? []).length ? String((application.siblings ?? []).length) : ''),
    relatives: (application.relatives ?? []).map((relative: any) => ({
      relativeType: relative.relativeType ?? 'paternal_grandfather',
      name: relative.name ?? '',
      age: stringValue(relative.age),
      monthlyIncome: stringValue(relative.monthlyIncome),
      occupation: relative.occupation ?? '',
      occupationOther: relative.occupationOther ?? '',
      supportType: relative.supportType ?? '',
      supportTypeOther: relative.supportTypeOther ?? '',
    })),
    householdAssetSelection,
    otherHouseholdAssets: householdAssetRowsToOtherItems(householdAssets),
    monthlyMedicalExpenses: stringValue(application.monthlyMedicalExpenses),
    termsAccepted: application.termsAccepted ?? false,
    status: (application.status === 'draft' ? 'draft' : 'submitted') as 'draft' | 'submitted',
  };
}

export function documentsToWizardDocuments(documents: ApplicationDocumentView[]): FormData['documents'] {
  return documents.map((document) => ({
    id: document.id,
    documentType: document.documentType,
    fileUrl: document.fileUrl ?? '',
    mimeType: document.mimeType,
    size: document.size,
    fileKey: document.fileKey,
  }));
}

