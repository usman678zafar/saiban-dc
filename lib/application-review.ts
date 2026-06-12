import type { FormData } from '@/components/orphan-application-wizard';
import { labels } from '@/lib/labels';
import {
  HOUSEHOLD_ASSET_KEYS,
  assetUsesGrams,
  householdAssetDisplayLabel,
} from '@/lib/household-assets';

export type ApplicationReviewDocument = {
  documentType: string;
};

export type ApplicationReviewItem = {
  label: string;
  value: string;
  filled: boolean;
};

export type ApplicationReviewSection = {
  title: string;
  items: ApplicationReviewItem[];
};

export type ApplicationReviewStep = {
  number: number | null;
  title: string;
  sections: ApplicationReviewSection[];
};

type ApplicationReviewData = Partial<FormData>;
type ReviewField = keyof FormData;

const motherOccupationsWithoutIncome = [
  'Housewife',
  'Unemployed',
  'Widow Support / Charity Dependent',
  'Disabled / Unable to Work',
  'Retired',
];

const documentLabels: Record<string, string> = {
  child_photo: "Orphan's Picture",
  child_b_form: "Orphan's B-Form",
  father_cnic: "Father's CNIC - Combined",
  father_cnic_front: "Father's CNIC - Front",
  father_cnic_back: "Father's CNIC - Back",
  father_death_certificate: "Father's Death Certificate",
  mother_cnic: "Mother's CNIC - Combined",
  mother_cnic_front: "Mother's CNIC - Front",
  mother_cnic_back: "Mother's CNIC - Back",
  mother_death_certificate: "Mother's Death Certificate",
  guardian_cnic: "Guardian's CNIC - Combined",
  guardian_cnic_front: "Guardian's CNIC - Front",
  guardian_cnic_back: "Guardian's CNIC - Back",
  school_letter: 'School Letter',
  fee_voucher: 'Fee Voucher',
  medical_report: 'Medical Report',
  imam_verification: 'Imam Verification',
  principal_verification: 'Principal Verification',
  attestation_confirmation: 'Attestation - Combined',
  attestation_page_1: 'Attestation - Page 1',
  attestation_page_2: 'Attestation - Page 2',
  house_photo: 'House Photo',
  other: 'Other Document',
};

const attestationDocumentTypes = ['attestation_confirmation', 'attestation_page_1', 'attestation_page_2'];
const specialFieldLabels: Partial<Record<ReviewField, string>> = {
  relatives: 'Relatives',
  siblings: 'Siblings',
  householdAssetSelection: 'Household Assets',
};

export const applicationReviewStepTitles = [
  'Father',
  'Mother',
  'Guardian',
  'Relatives',
  'Home',
  'Assets',
  'Child',
  'Health',
  'Education and Skills',
  'Income',
  'Attestation',
  'Documents',
] as const;

function text(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isFilled(value: unknown) {
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return text(value) !== '';
}

function yesNo(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return text(value);
}

function fieldLabel(field: ReviewField) {
  return specialFieldLabels[field] ?? labels[field]?.en ?? String(field);
}

function motherOccupationNeedsIncome(occupation?: string) {
  return Boolean(occupation) && !motherOccupationsWithoutIncome.some((value) => occupation === value || occupation?.startsWith(value));
}

function guardianDetailsNeeded(data: ApplicationReviewData) {
  return data.motherAlive !== 'yes' || data.motherIsGuardian !== 'yes';
}

function motherIsLiving(data: ApplicationReviewData) {
  return data.motherAlive === 'yes' || data.motherAlive === 'separated';
}

function documentTypesFor(data: ApplicationReviewData) {
  const types = [
    { type: 'child_photo', label: documentLabels.child_photo },
    { type: 'child_b_form', label: documentLabels.child_b_form },
    { type: 'father_death_certificate', label: documentLabels.father_death_certificate },
  ];

  if (data.motherAlive === 'no') {
    types.push({ type: 'mother_death_certificate', label: documentLabels.mother_death_certificate });
  }

  if (data.healthStatus === 'chronic_illness' || data.healthStatus === 'disabled') {
    types.push({ type: 'medical_report', label: documentLabels.medical_report });
  }

  if ((data.currentlyStudying || data.enrolledInMadrasa) && data.educationFree === 'no') {
    types.push({ type: 'fee_voucher', label: documentLabels.fee_voucher });
  }

  return types;
}

function cnicDocumentGroupsFor(data: ApplicationReviewData) {
  const groups = [
    {
      title: "Father's CNIC",
      combinedType: 'father_cnic',
      frontType: 'father_cnic_front',
      backType: 'father_cnic_back',
      required: false,
    },
  ];

  if (data.motherAlive !== 'no') {
    groups.push({
      title: "Mother's CNIC",
      combinedType: 'mother_cnic',
      frontType: 'mother_cnic_front',
      backType: 'mother_cnic_back',
      required: true,
    });
  }

  if (guardianDetailsNeeded(data)) {
    groups.push({
      title: "Guardian's CNIC",
      combinedType: 'guardian_cnic',
      frontType: 'guardian_cnic_front',
      backType: 'guardian_cnic_back',
      required: true,
    });
  }

  return groups;
}

function hasDocument(documents: ApplicationReviewDocument[], documentType: string) {
  return documents.some((document) => document.documentType === documentType);
}

function isCnicGroupComplete(group: ReturnType<typeof cnicDocumentGroupsFor>[number], documents: ApplicationReviewDocument[]) {
  const hasCombined = hasDocument(documents, group.combinedType);
  const hasBothSides = hasDocument(documents, group.frontType) && hasDocument(documents, group.backType);
  if (hasCombined || hasBothSides) return true;
  return !group.required && !hasDocument(documents, group.frontType) && !hasDocument(documents, group.backType);
}

function hasCompleteAttestation(documents: ApplicationReviewDocument[]) {
  return hasDocument(documents, 'attestation_confirmation')
    || (hasDocument(documents, 'attestation_page_1') && hasDocument(documents, 'attestation_page_2'));
}

export function shouldShowReviewField(data: ApplicationReviewData, field: ReviewField) {
  if (['motherDeathDate', 'motherDeathCause'].includes(field)) return data.motherAlive === 'no';
  if (field === 'motherSeparationReason') return data.motherAlive === 'separated';
  if (['motherContact', 'motherOccupation'].includes(field)) return data.motherAlive === 'yes';
  if (field === 'motherRemarried') return motherIsLiving(data);
  if (field === 'motherMonthlyIncome') return data.motherAlive === 'yes' && motherOccupationNeedsIncome(text(data.motherOccupation));
  if (field === 'motherDisabilityRemarks') return data.motherHealthStatus === 'disabled';
  if (field === 'guardianOccupation') return guardianDetailsNeeded(data) && Boolean(data.guardianGender);
  if (['guardianName', 'guardianRelationship', 'guardianGender', 'guardianDob', 'guardianAge', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue', 'guardianNativeArea', 'guardianContact', 'guardianFamilyHolder', 'guardianMonthlyIncome', 'guardianHealthStatus'].includes(field)) {
    return guardianDetailsNeeded(data);
  }
  if (field === 'guardianDisabilityRemarks') return guardianDetailsNeeded(data) && data.guardianHealthStatus === 'disabled';
  if (field === 'guardianFamilyMembersCount') return guardianDetailsNeeded(data) && data.guardianFamilyHolder === 'yes';
  if (['monthlyRent', 'rentPaidBy'].includes(field)) return data.houseOwnershipStatus === 'rent';
  if (field === 'disabilityDetails') return data.healthStatus === 'disabled';
  if (field === 'treatmentPlace') return data.healthStatus === 'chronic_illness' || data.treatmentOngoing === 'yes';
  if (field === 'specifyNationality') return data.nationality === 'Other';
  if (field === 'specifyReligion') return data.religion === 'Other';
  if (field === 'monthlyMedicalExpenses') return data.healthStatus === 'chronic_illness' || data.healthStatus === 'disabled';
  if (['currentClass', 'schoolName', 'schoolAddress', 'schoolDistanceKm', 'schoolTransportMode', 'schoolStudyingSince'].includes(field)) return Boolean(data.currentlyStudying);
  if (field === 'notStudyingReason') return data.currentlyStudying === false;
  if (field === 'educationStartCondition') return Boolean(data.enrolledInMadrasa);
  if (field === 'monthlySchoolFee') return (Boolean(data.currentlyStudying) || Boolean(data.enrolledInMadrasa)) && data.educationFree === 'no';
  if (field === 'educationFree') return Boolean(data.currentlyStudying) || Boolean(data.enrolledInMadrasa);
  if (['madrasaName', 'madrasaEducationDetails'].includes(field)) return Boolean(data.enrolledInMadrasa);
  if (field === 'currentSkill') return data.currentSkillLearning === 'yes';
  if (field === 'technicalSkillInterest') return data.currentSkillLearning === 'no';
  if (field === 'technicalSkill') return data.currentSkillLearning === 'no' && data.technicalSkillInterest === 'yes';
  if (['otherAidSource', 'monthlyAidAmount'].includes(field)) return Boolean(data.receivingOtherAid);
  if (['assistanceApplied', 'assistanceAppliedWhere'].includes(field)) return !data.receivingOtherAid && (field !== 'assistanceAppliedWhere' || data.assistanceApplied === 'yes');
  if (['householdEarnersCount', 'totalHouseholdIncome', 'childEarnsIncome'].includes(field)) return data.householdHasMonthlyIncome === 'yes';
  if (['childWorkNature', 'childMonthlyIncome'].includes(field)) return data.householdHasMonthlyIncome === 'yes' && data.childEarnsIncome === 'yes';
  return true;
}

function formatDateTime(value: unknown) {
  const raw = text(value);
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
}

function formatReviewValue(data: ApplicationReviewData, field: ReviewField) {
  if (field === 'householdAssetSelection') return formatHouseholdAssets(data);
  if (field === 'siblings') return formatSiblings(data.siblings ?? []);
  if (field === 'relatives') return formatRelatives(data.relatives ?? []);
  if (field === 'tehsil' && (!data.tehsil || data.tehsil === 'unknown')) return 'Not Available / Unknown';
  if (field === 'gpsAccuracyMeters' && data.gpsAccuracyMeters) return `${data.gpsAccuracyMeters} m`;
  if (field === 'gpsCapturedAt') return formatDateTime(data.gpsCapturedAt);
  if (typeof data[field] === 'boolean') return yesNo(data[field]);
  if (Array.isArray(data[field])) return (data[field] as unknown[]).length ? `${(data[field] as unknown[]).length} record(s)` : '';
  return text(data[field]);
}

function formatSiblings(siblings: NonNullable<ApplicationReviewData['siblings']>) {
  if (!siblings.length) return '';
  return siblings.map((sibling, index) => {
    const rows = [
      ['Name', sibling.name],
      ['Relation', sibling.relation],
      ['DOB', sibling.dob],
      ['Age', sibling.age],
      ['Education', sibling.educationStatus],
      ['Currently Studying', yesNo(sibling.currentlyStudying)],
      ['Occupation', sibling.occupation],
      ['Monthly Income/Fee', sibling.monthlyIncomeOrFee],
      ['Marital Status', sibling.maritalStatus],
      ['Health Status', sibling.healthStatus],
      ['Disability Remarks', sibling.disabilityRemarks],
    ].filter(([, value]) => isFilled(value)).map(([label, value]) => `${label}: ${value}`);

    return [`Sibling ${index + 1}`, ...rows].join('\n');
  }).join('\n\n');
}

function formatRelatives(relatives: NonNullable<ApplicationReviewData['relatives']>) {
  if (!relatives.length) return '';
  return relatives.map((relative, index) => {
    const rows = [
      ['Relationship', relative.relativeType?.replace(/_/g, ' ')],
      ['Name', relative.name],
      ['Age', relative.age],
      ['Occupation', relative.occupation === 'Other' ? relative.occupationOther : relative.occupation],
      ['Monthly Income', relative.monthlyIncome],
      ['Support Type', relative.supportType === 'other' ? relative.supportTypeOther : relative.supportType?.replace(/_/g, ' ')],
    ].filter(([, value]) => isFilled(value)).map(([label, value]) => `${label}: ${value}`);

    return [`Relative ${index + 1}`, ...rows].join('\n');
  }).join('\n\n');
}

function formatHouseholdAssets(data: ApplicationReviewData) {
  const selection = data.householdAssetSelection;
  if (!selection) return '';

  const rows = HOUSEHOLD_ASSET_KEYS
    .filter((key) => key !== 'other')
    .map((key) => {
      const entry = selection[key];
      if (!entry?.answered) return `${householdAssetDisplayLabel(key)}: Not answered`;
      if (!entry.has) return `${householdAssetDisplayLabel(key)}: No`;
      const grams = assetUsesGrams(key) && entry.grams ? `, ${entry.grams} grams` : '';
      const value = entry.value ? `${entry.value} PKR` : 'value missing';
      return `${householdAssetDisplayLabel(key)}: Yes, ${value}${grams}`;
    });

  const otherRows = (data.otherHouseholdAssets ?? [])
    .filter((asset) => isFilled(asset.item) || isFilled(asset.value))
    .map((asset, index) => `Other ${index + 1}: ${text(asset.item) || 'Unnamed item'}${text(asset.value) ? `, ${asset.value} PKR` : ''}`);

  return [...rows, ...otherRows].filter(Boolean).join('\n');
}

function fieldItems(data: ApplicationReviewData, fields: ReviewField[]) {
  return fields
    .filter((field) => shouldShowReviewField(data, field))
    .map((field) => {
      const value = formatReviewValue(data, field);
      return {
        label: fieldLabel(field),
        value: value || '-',
        filled: isFilled(value),
      };
    });
}

function documentItems(data: ApplicationReviewData, documents: ApplicationReviewDocument[]) {
  const items = documentTypesFor(data).map((document) => ({
    label: document.label,
    value: hasDocument(documents, document.type) ? 'Uploaded' : 'Missing',
    filled: hasDocument(documents, document.type),
  }));

  const cnicItems = cnicDocumentGroupsFor(data).map((group) => {
    const combined = hasDocument(documents, group.combinedType);
    const front = hasDocument(documents, group.frontType);
    const back = hasDocument(documents, group.backType);
    const complete = isCnicGroupComplete(group, documents);
    const value = combined
      ? 'Combined file uploaded'
      : front || back
        ? `Front: ${front ? 'Uploaded' : 'Missing'}, Back: ${back ? 'Uploaded' : 'Missing'}`
        : group.required
          ? 'Missing'
          : 'Optional, not uploaded';
    return { label: group.title, value, filled: complete };
  });

  return [...items, ...cnicItems];
}

function attestationItems(documents: ApplicationReviewDocument[]) {
  const combined = hasDocument(documents, 'attestation_confirmation');
  const page1 = hasDocument(documents, 'attestation_page_1');
  const page2 = hasDocument(documents, 'attestation_page_2');
  return [
    {
      label: 'Attestation upload',
      value: combined
        ? 'Combined attestation uploaded'
        : page1 || page2
          ? `Page 1: ${page1 ? 'Uploaded' : 'Missing'}, Page 2: ${page2 ? 'Uploaded' : 'Missing'}`
          : 'Missing',
      filled: combined || (page1 && page2),
    },
  ];
}

export function buildApplicationReview(data: ApplicationReviewData, documents: ApplicationReviewDocument[] = []): ApplicationReviewStep[] {
  return [
    {
      number: null,
      title: 'Application Info',
      sections: [
        {
          title: 'Collector and Registration',
          items: fieldItems(data, ['registrationNumber', 'collectorId', 'collectorName', 'collectorProject', 'collectorCnic', 'collectorAddress', 'collectorContact']),
        },
      ],
    },
    {
      number: 1,
      title: applicationReviewStepTitles[0],
      sections: [{ title: 'Deceased Father Details', items: fieldItems(data, ['fatherName', 'fatherDob', 'fatherDateOfDeath', 'fatherAge', 'fatherCnic', 'fatherEducation', 'fatherTongue', 'fatherNativeArea', 'fatherOccupation', 'fatherCauseOfDeath']) }],
    },
    {
      number: 2,
      title: applicationReviewStepTitles[1],
      sections: [{ title: 'Mother Details', items: fieldItems(data, ['motherName', 'motherDob', 'motherAlive', 'motherAge', 'motherCnic', 'motherEducation', 'motherTongue', 'motherNativeArea', 'motherSeparationReason', 'motherContact', 'motherOccupation', 'motherMonthlyIncome', 'motherRemarried', 'motherDeathDate', 'motherDeathCause', 'motherHealthStatus', 'motherDisabilityRemarks']) }],
    },
    {
      number: 3,
      title: applicationReviewStepTitles[2],
      sections: [{ title: 'Guardian Details', items: fieldItems(data, ['motherIsGuardian', 'guardianName', 'guardianDob', 'guardianAge', 'guardianGender', 'guardianRelationship', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue', 'guardianNativeArea', 'guardianContact', 'guardianOccupation', 'guardianFamilyHolder', 'guardianFamilyMembersCount', 'guardianMonthlyIncome', 'guardianHealthStatus', 'guardianDisabilityRemarks']) }],
    },
    {
      number: 4,
      title: applicationReviewStepTitles[3],
      sections: [{ title: 'Close Relatives', items: fieldItems(data, ['relativeInformationDisclosed', 'relatives']) }],
    },
    {
      number: 5,
      title: applicationReviewStepTitles[4],
      sections: [
        { title: 'Address and GPS', items: fieldItems(data, ['province', 'district', 'tehsil', 'city', 'residentialArea', 'fullAddress', 'latitude', 'longitude', 'gpsAccuracyMeters', 'gpsCapturedAt']) },
        { title: 'Home Details', items: fieldItems(data, ['houseOwnershipStatus', 'monthlyRent', 'rentPaidBy', 'houseCondition', 'residenceStructureType', 'residenceCategory', 'houseConditionRemarks', 'electricityAvailable', 'gasAvailable', 'waterAvailable', 'furnishingCondition', 'furnishingConditionRemarks']) },
      ],
    },
    {
      number: 6,
      title: applicationReviewStepTitles[5],
      sections: [{ title: 'Household Assets', items: fieldItems(data, ['householdAssetSelection']) }],
    },
    {
      number: 7,
      title: applicationReviewStepTitles[6],
      sections: [{ title: 'Orphan Child and Siblings', items: fieldItems(data, ['childName', 'gender', 'religion', 'specifyReligion', 'syedStatus', 'nationality', 'specifyNationality', 'bFormNumber', 'dateOfBirth', 'age', 'totalSiblings', 'siblings']) }],
    },
    {
      number: 8,
      title: applicationReviewStepTitles[7],
      sections: [{ title: 'Health Information', items: fieldItems(data, ['healthStatus', 'disabilityType', 'disabilityCause', 'disabilityDetails', 'disabilityCauseDetails', 'disabilitySince', 'treatmentOngoing', 'chronicDisease', 'specifyDisease', 'illnessSince', 'treatmentPlace', 'monthlyMedicalExpenses']) }],
    },
    {
      number: 9,
      title: applicationReviewStepTitles[8],
      sections: [{ title: 'Education and Skills', items: fieldItems(data, ['currentlyStudying', 'notStudyingReason', 'currentClass', 'schoolName', 'schoolAddress', 'schoolDistanceKm', 'schoolTransportMode', 'schoolStudyingSince', 'enrolledInMadrasa', 'madrasaName', 'madrasaEducationDetails', 'educationStartCondition', 'educationUndertakingAccepted', 'educationFree', 'monthlySchoolFee', 'currentSkillLearning', 'currentSkill', 'childHobbies', 'technicalSkillInterest', 'technicalSkill']) }],
    },
    {
      number: 10,
      title: applicationReviewStepTitles[9],
      sections: [{ title: 'Household Income and Assistance', items: fieldItems(data, ['totalFamilyMembers', 'householdHasMonthlyIncome', 'householdEarnersCount', 'totalHouseholdIncome', 'childEarnsIncome', 'childWorkNature', 'childMonthlyIncome', 'receivingOtherAid', 'otherAidSource', 'monthlyAidAmount', 'assistanceApplied', 'assistanceAppliedWhere']) }],
    },
    {
      number: 11,
      title: applicationReviewStepTitles[10],
      sections: [{ title: 'Attestation', items: attestationItems(documents) }],
    },
    {
      number: 12,
      title: applicationReviewStepTitles[11],
      sections: [{ title: 'Uploaded Documents', items: documentItems(data, documents) }],
    },
  ].map((step) => ({
    ...step,
    sections: step.sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.value !== '-' || item.filled),
    })).filter((section) => section.items.length > 0),
  })).filter((step) => step.sections.length > 0);
}

function completionItem(label: string, complete: boolean) {
  return { label, complete };
}

function requiredFieldCompletionItems(data: ApplicationReviewData, fields: ReviewField[]) {
  return fields.map((field) => completionItem(fieldLabel(field), isFilled(data[field])));
}

export function getStepCompletionItems(data: ApplicationReviewData, documents: ApplicationReviewDocument[], stepNumber: number) {
  switch (stepNumber) {
    case 1:
      return requiredFieldCompletionItems(data, ['fatherName', 'fatherDob', 'fatherCnic', 'fatherEducation', 'fatherTongue', 'fatherNativeArea', 'fatherOccupation', 'fatherDateOfDeath', 'fatherCauseOfDeath']);
    case 2: {
      const fields: ReviewField[] = ['motherName', 'motherDob', 'motherAlive', 'motherCnic', 'motherEducation', 'motherTongue', 'motherNativeArea'];
      if (data.motherAlive === 'no') fields.push('motherDeathDate', 'motherDeathCause');
      if (data.motherAlive === 'separated') fields.push('motherSeparationReason');
      if (data.motherAlive === 'yes') {
        fields.push('motherContact', 'motherOccupation');
        if (motherOccupationNeedsIncome(text(data.motherOccupation))) fields.push('motherMonthlyIncome');
      }
      return requiredFieldCompletionItems(data, fields);
    }
    case 3: {
      if (!guardianDetailsNeeded(data)) return [completionItem('Mother marked as guardian', true)];
      const fields: ReviewField[] = ['guardianName', 'guardianDob', 'guardianAge', 'guardianRelationship', 'guardianGender', 'guardianCnic', 'guardianContact', 'guardianMonthlyIncome'];
      if (data.guardianFamilyHolder === 'yes') fields.push('guardianFamilyMembersCount');
      return requiredFieldCompletionItems(data, fields);
    }
    case 4: {
      const items = [completionItem("Close relatives' disclosure answered", isFilled(data.relativeInformationDisclosed))];
      if (data.relativeInformationDisclosed === 'yes') {
        const relatives = data.relatives ?? [];
        items.push(completionItem('At least one relative entered', relatives.length > 0));
        relatives.forEach((relative, index) => {
          items.push(completionItem(`Relative ${index + 1} name`, isFilled(relative.name)));
          items.push(completionItem(`Relative ${index + 1} occupation`, isFilled(relative.occupation)));
          if (relative.occupation === 'Other') items.push(completionItem(`Relative ${index + 1} occupation detail`, isFilled(relative.occupationOther)));
          items.push(completionItem(`Relative ${index + 1} monthly income`, isFilled(relative.monthlyIncome)));
          items.push(completionItem(`Relative ${index + 1} support type`, isFilled(relative.supportType)));
          if (relative.supportType === 'other') items.push(completionItem(`Relative ${index + 1} support detail`, isFilled(relative.supportTypeOther)));
        });
      }
      return items;
    }
    case 5: {
      const fields: ReviewField[] = ['province', 'district', 'city', 'houseOwnershipStatus', 'houseCondition', 'residenceStructureType', 'residenceCategory', 'furnishingCondition'];
      if (data.houseOwnershipStatus === 'rent') fields.push('monthlyRent', 'rentPaidBy');
      return [
        ...requiredFieldCompletionItems(data, fields),
        completionItem('Residential area or full address', isFilled(data.residentialArea) || isFilled(data.fullAddress)),
      ];
    }
    case 6: {
      const selection = data.householdAssetSelection;
      const items = HOUSEHOLD_ASSET_KEYS
        .filter((key) => key !== 'other')
        .map((key) => completionItem(`${householdAssetDisplayLabel(key)} answered`, Boolean(selection?.[key]?.answered)));

      HOUSEHOLD_ASSET_KEYS
        .filter((key) => key !== 'other' && selection?.[key]?.answered && selection[key].has)
        .forEach((key) => {
          items.push(completionItem(`${householdAssetDisplayLabel(key)} value`, isFilled(selection?.[key]?.value)));
          if (assetUsesGrams(key)) items.push(completionItem(`${householdAssetDisplayLabel(key)} grams`, isFilled(selection?.[key]?.grams)));
        });

      (data.otherHouseholdAssets ?? []).forEach((asset, index) => {
        items.push(completionItem(`Other asset ${index + 1} item`, isFilled(asset.item)));
        items.push(completionItem(`Other asset ${index + 1} value`, isFilled(asset.value)));
      });

      return items;
    }
    case 7: {
      const items = requiredFieldCompletionItems(data, ['childName', 'gender', 'religion', 'syedStatus', 'nationality', 'bFormNumber', 'dateOfBirth', 'totalSiblings']);
      if (data.religion === 'Other') items.push(completionItem('Specify religion', isFilled(data.specifyReligion)));
      if (data.nationality === 'Other') items.push(completionItem('Specify nationality', isFilled(data.specifyNationality)));
      const totalSiblings = Number(data.totalSiblings || 0);
      const siblings = data.siblings ?? [];
      if (totalSiblings > 0) {
        items.push(completionItem('Sibling count matches total', siblings.length === totalSiblings));
        siblings.forEach((sibling, index) => {
          items.push(completionItem(`Sibling ${index + 1} name`, isFilled(sibling.name)));
          items.push(completionItem(`Sibling ${index + 1} relation`, isFilled(sibling.relation)));
          items.push(completionItem(`Sibling ${index + 1} DOB`, isFilled(sibling.dob)));
          items.push(completionItem(`Sibling ${index + 1} education`, isFilled(sibling.educationStatus)));
          items.push(completionItem(`Sibling ${index + 1} studying status`, isFilled(sibling.currentlyStudying)));
          items.push(completionItem(`Sibling ${index + 1} occupation`, isFilled(sibling.occupation)));
          items.push(completionItem(`Sibling ${index + 1} monthly income`, isFilled(sibling.monthlyIncomeOrFee)));
          items.push(completionItem(`Sibling ${index + 1} marital status`, isFilled(sibling.maritalStatus)));
          items.push(completionItem(`Sibling ${index + 1} health status`, isFilled(sibling.healthStatus)));
          if (sibling.healthStatus === 'disabled') {
            items.push(completionItem(`Sibling ${index + 1} disability remarks`, isFilled(sibling.disabilityRemarks)));
          }
        });
      }
      return items;
    }
    case 8: {
      const fields: ReviewField[] = ['healthStatus'];
      if (data.healthStatus === 'disabled') {
        fields.push('disabilityType', 'disabilityCause', 'disabilityDetails', 'treatmentOngoing', 'monthlyMedicalExpenses');
        if (data.treatmentOngoing === 'yes') fields.push('treatmentPlace');
      }
      if (data.healthStatus === 'chronic_illness') fields.push('chronicDisease', 'treatmentPlace', 'monthlyMedicalExpenses');
      return requiredFieldCompletionItems(data, fields);
    }
    case 9: {
      const fields: ReviewField[] = ['currentlyStudying', 'enrolledInMadrasa', 'currentSkillLearning'];
      if (data.currentlyStudying) fields.push('currentClass', 'schoolName', 'schoolAddress', 'schoolDistanceKm', 'schoolTransportMode', 'schoolStudyingSince');
      if (data.enrolledInMadrasa) fields.push('madrasaName', 'madrasaEducationDetails', 'educationStartCondition');
      if (data.currentlyStudying || data.enrolledInMadrasa) {
        if (data.educationFree === 'no') fields.push('monthlySchoolFee');
      }
      if (data.currentSkillLearning === 'yes') fields.push('currentSkill');
      if (data.currentSkillLearning === 'no') {
        fields.push('technicalSkillInterest');
        if (data.technicalSkillInterest === 'yes') fields.push('technicalSkill');
      }
      return [
        ...requiredFieldCompletionItems(data, fields),
        ...((data.currentlyStudying || data.enrolledInMadrasa) && data.educationFree === 'no'
          ? [completionItem('Fee voucher uploaded', hasDocument(documents, 'fee_voucher'))]
          : []),
      ];
    }
    case 10: {
      const fields: ReviewField[] = ['totalFamilyMembers', 'householdHasMonthlyIncome', 'receivingOtherAid'];
      if (data.householdHasMonthlyIncome === 'yes') {
        fields.push('householdEarnersCount', 'totalHouseholdIncome', 'childEarnsIncome');
        if (data.childEarnsIncome === 'yes') fields.push('childWorkNature', 'childMonthlyIncome');
      }
      if (data.receivingOtherAid) {
        fields.push('otherAidSource', 'monthlyAidAmount');
      } else {
        fields.push('assistanceApplied');
        if (data.assistanceApplied === 'yes') fields.push('assistanceAppliedWhere');
      }
      return requiredFieldCompletionItems(data, fields);
    }
    case 11:
      return [completionItem('Attestation uploaded', hasCompleteAttestation(documents))];
    case 12:
      return [
        ...documentTypesFor(data).map((document) => completionItem(`${document.label} uploaded`, hasDocument(documents, document.type))),
        ...cnicDocumentGroupsFor(data).map((group) => completionItem(`${group.title} complete`, isCnicGroupComplete(group, documents))),
      ];
    default:
      return [];
  }
}

export function isApplicationStepComplete(data: ApplicationReviewData, documents: ApplicationReviewDocument[], stepNumber: number) {
  const items = getStepCompletionItems(data, documents, stepNumber);
  return items.length === 0 || items.every((item) => item.complete);
}

export function calculateApplicationCompletion(data: ApplicationReviewData, documents: ApplicationReviewDocument[] = []) {
  const items = Array.from({ length: 12 }, (_, index) => getStepCompletionItems(data, documents, index + 1)).flat();
  const total = items.length;
  const complete = items.filter((item) => item.complete).length;
  return {
    complete,
    total,
    percentage: total === 0 ? 0 : Math.round((complete / total) * 100),
  };
}
