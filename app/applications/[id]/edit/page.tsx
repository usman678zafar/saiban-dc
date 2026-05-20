import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AppShell from '@/components/app-shell';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import type { FormData } from '@/components/orphan-application-wizard';
import { householdAssetRowsToOtherItems, householdAssetRowsToSelection } from '@/lib/household-assets';
import { getApplicationDocuments, type ApplicationDocumentView } from '@/lib/application-documents';

interface EditApplicationPageProps {
  params: {
    id: string;
  };
}

export default async function EditApplicationPage({ params }: EditApplicationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    notFound();
  }

  const application = await prisma.orphanApplication.findUnique({
    where: { id: params.id },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
    },
  });

  if (!application) {
    notFound();
  }

  if (application.createdById !== session.user.id && session.user.role !== 'admin') {
    notFound();
  }

  if (session.user.role !== 'admin' && !['draft', 'needs_correction'].includes(application.status)) {
    notFound();
  }

  const applicationDocuments = await getApplicationDocuments(application.id);
  const app = application as any;
  const initialData: Partial<FormData> = {
    registrationNumber: app.registrationNumber ?? '',
    collectorId: app.collectorId ?? '',
    collectorName: app.collectorName ?? '',
    collectorProject: app.collectorProject ?? '',
    collectorCnic: app.collectorCnic ?? '',
    collectorAddress: app.collectorAddress ?? '',
    collectorContact: app.collectorContact ?? '',
    childName: app.childName ?? '',
    gender: app.gender ?? '',
    caste: app.caste ?? '',
    sect: app.sect ?? '',
    religion: app.religion ?? '',
    specifyReligion: app.specifyReligion ?? '',
    syedStatus: app.syedStatus ?? '',
    nationality: app.nationality ?? 'Pakistani',
    specifyNationality: app.specifyNationality ?? '',
    dateOfBirth: app.dateOfBirth ? app.dateOfBirth.toISOString().slice(0, 10) : '',
    bFormNumber: app.bFormNumber ?? '',
    city: app.city ?? '',
    fatherName: app.fatherName ?? '',
    fatherDob: app.fatherDob ? app.fatherDob.toISOString().slice(0, 10) : '',
    fatherAge: app.fatherAge?.toString() ?? '',
    fatherCnic: app.fatherCnic ?? '',
    fatherEducation: app.fatherEducation ?? '',
    fatherTongue: app.fatherTongue ?? '',
    fatherNativeArea: app.fatherNativeArea ?? '',
    fatherOccupation: app.fatherOccupation ?? '',
    fatherDateOfDeath: app.fatherDateOfDeath ? app.fatherDateOfDeath.toISOString().slice(0, 10) : '',
    fatherCauseOfDeath: app.fatherCauseOfDeath ?? '',
    motherName: app.motherName ?? '',
    motherDob: app.motherDob ? app.motherDob.toISOString().slice(0, 10) : '',
    motherAge: app.motherAge?.toString() ?? '',
    motherCnic: app.motherCnic ?? '',
    motherEducation: app.motherEducation ?? '',
    motherTongue: app.motherTongue ?? '',
    motherNativeArea: app.motherNativeArea ?? '',
    motherAlive: app.motherAlive ?? '',
    motherSeparationReason: app.motherSeparationReason ?? '',
    motherEmploymentStatus: app.motherEmploymentStatus ?? '',
    motherIsGuardian: app.motherIsGuardian ?? '',
    motherContact: app.motherContact ?? '',
    motherIsHousewife: app.motherIsHousewife ?? false,
    motherOccupation: app.motherOccupation ?? '',
    motherMonthlyIncome: app.motherMonthlyIncome?.toString() ?? '',
    motherRemarried: app.motherRemarried ?? false,
    motherDeathDate: app.motherDeathDate ? app.motherDeathDate.toISOString().slice(0, 10) : '',
    motherDeathCause: app.motherDeathCause ?? '',
    guardianName: app.guardianName ?? '',
    guardianRelationship: app.guardianRelationship ?? '',
    guardianGender: app.guardianGender ?? '',
    guardianCnic: app.guardianCnic ?? '',
    guardianEducation: app.guardianEducation ?? '',
    guardianMotherTongue: app.guardianMotherTongue ?? '',
    guardianNativeArea: app.guardianNativeArea ?? '',
    guardianContact: app.guardianContact ?? '',
    guardianZakatStatus: app.guardianZakatStatus ?? '',
    guardianOccupation: app.guardianOccupation ?? '',
    guardianFamilyHolder: app.guardianFamilyHolder ?? '',
    guardianFamilyHolderAmount: app.guardianFamilyHolderAmount?.toString() ?? '',
    guardianFamilyMembersCount: app.guardianFamilyMembersCount?.toString() ?? '',
    guardianMonthlyIncome: app.guardianMonthlyIncome?.toString() ?? '',
    guardianSignatureFileKey: app.guardianSignatureFileKey ?? '',
    paternalGrandfatherName: app.paternalGrandfatherName ?? '',
    paternalGrandfatherAge: app.paternalGrandfatherAge?.toString() ?? '',
    paternalGrandfatherOccupation: app.paternalGrandfatherOccupation ?? '',
    paternalGrandfatherIncome: app.paternalGrandfatherIncome?.toString() ?? '',
    maternalGrandfatherName: app.maternalGrandfatherName ?? '',
    maternalGrandfatherAge: app.maternalGrandfatherAge?.toString() ?? '',
    maternalGrandfatherOccupation: app.maternalGrandfatherOccupation ?? '',
    maternalGrandfatherIncome: app.maternalGrandfatherIncome?.toString() ?? '',
    relativeInformationDisclosed: app.relativeInformationDisclosed === true ? 'yes' : app.relativeInformationDisclosed === false ? 'no' : '',
    province: app.province ?? '',
    district: app.district ?? '',
    tehsil: app.tehsil ?? '',
    residentialArea: app.residentialArea ?? '',
    fullAddress: app.fullAddress ?? '',
    latitude: app.latitude?.toString() ?? '',
    longitude: app.longitude?.toString() ?? '',
    gpsAccuracyMeters: app.gpsAccuracyMeters?.toString() ?? '',
    gpsCapturedAt: app.gpsCapturedAt ? app.gpsCapturedAt.toISOString() : '',
    houseOwnershipStatus: app.houseOwnershipStatus ?? '',
    monthlyRent: app.monthlyRent?.toString() ?? '',
    rentPaidBy: app.rentPaidBy ?? '',
    houseOwner: app.houseOwner ?? '',
    houseCondition: app.houseCondition ?? '',
    residenceStructureType: app.residenceStructureType ?? '',
    residenceCategory: app.residenceCategory ?? '',
    houseConditionRemarks: app.houseConditionRemarks ?? '',
    electricityAvailable: app.electricityAvailable ?? false,
    gasAvailable: app.gasAvailable ?? false,
    waterAvailable: app.waterAvailable ?? false,
    furnishingCondition: app.furnishingCondition ?? '',
    furnishingConditionRemarks: app.furnishingConditionRemarks ?? '',
    age: app.age?.toString() ?? '',
    totalBrothers: app.totalBrothers?.toString() ?? '',
    totalSisters: app.totalSisters?.toString() ?? '',
    registeredBrothers: app.registeredBrothers?.toString() ?? '',
    registeredSisters: app.registeredSisters?.toString() ?? '',
    siblingsUnder12: app.siblingsUnder12?.toString() ?? '',
    childLivesWithMother: app.childLivesWithMother ?? false,
    livingSituationNotes: app.livingSituationNotes ?? '',
    healthStatus: app.healthStatus ?? '',
    disabilityDetails: app.disabilityDetails ?? '',
    disabilityType: app.disabilityType ?? '',
    disabilityCause: app.disabilityCause ?? '',
    disabilityCauseDetails: app.disabilityCauseDetails ?? '',
    disabilitySince: app.disabilitySince ?? '',
    treatmentOngoing: app.treatmentOngoing ?? '',
    chronicDisease: app.chronicDisease ?? '',
    specifyDisease: app.specifyDisease ?? '',
    illnessSince: app.illnessSince ? app.illnessSince.toISOString().slice(0, 10) : '',
    treatmentPlace: app.treatmentPlace ?? '',
    currentlyStudying: app.currentlyStudying ?? false,
    notStudyingReason: app.notStudyingReason ?? '',
    educationStartCondition: app.educationStartCondition ?? '',
    currentClass: app.currentClass ?? '',
    schoolName: app.schoolName ?? '',
    schoolAddress: app.schoolAddress ?? '',
    enrolledInMadrasa: app.enrolledInMadrasa ?? false,
    madrasaName: app.madrasaName ?? '',
    madrasaEducationDetails: app.madrasaEducationDetails ?? '',
    educationFeeStatus: app.educationFeeStatus ?? '',
    monthlySchoolFee: app.monthlySchoolFee?.toString() ?? '',
    schoolDistanceKm: app.schoolDistanceKm?.toString() ?? '',
    schoolTransportMode: app.schoolTransportMode ?? '',
    schoolStudyingSince: app.schoolStudyingSince ? app.schoolStudyingSince.toISOString().slice(0, 10) : '',
    educationUndertakingAccepted: app.educationUndertakingAccepted ?? false,
    educationFree: app.educationFree ?? '',
    currentSkillLearning: app.currentSkillLearning ?? '',
    currentSkill: app.currentSkill ?? '',
    childHobbies: app.childHobbies ? app.childHobbies.split(',').filter(Boolean) : [],
    technicalSkillInterest: app.technicalSkillInterest ?? '',
    technicalSkill: app.technicalSkill ?? '',
    careerGoal: app.careerGoal ?? '',
    technicalInterest: app.technicalInterest ?? '',
    learningSkill: app.learningSkill ?? '',
    totalFamilyMembers: app.totalFamilyMembers?.toString() ?? '',
    householdHasMonthlyIncome: app.householdHasMonthlyIncome ?? '',
    householdEarnersCount: app.householdEarnersCount?.toString() ?? '',
    totalHouseholdIncome: app.totalHouseholdIncome?.toString() ?? '',
    childEarnsIncome: app.childEarnsIncome ?? '',
    childWorkNature: app.childWorkNature ?? '',
    childMonthlyIncome: app.childMonthlyIncome?.toString() ?? '',
    assistanceApplied: app.assistanceApplied ?? '',
    assistanceAppliedWhere: app.assistanceAppliedWhere ?? '',
    receivingOtherAid: app.receivingOtherAid ?? false,
    otherAidSource: app.otherAidSource ?? '',
    monthlyAidAmount: app.monthlyAidAmount?.toString() ?? '',
    notAppliedElsewhereReason: app.notAppliedElsewhereReason ?? '',
    siblings: app.siblings.map((sibling: (typeof app.siblings)[number]) => ({
      name: sibling.name ?? '',
      relation: sibling.relation ?? 'brother',
      dob: sibling.dob ? sibling.dob.toISOString().slice(0, 10) : '',
      age: sibling.age?.toString() ?? '',
      educationStatus: sibling.educationStatus ?? '',
      currentlyStudying: sibling.currentlyStudying === true ? 'yes' : sibling.currentlyStudying === false ? 'no' : '',
      occupation: sibling.occupation ?? '',
      monthlyIncomeOrFee: sibling.monthlyIncomeOrFee?.toString() ?? '',
      maritalStatus: sibling.maritalStatus ?? '',
    })),
    totalSiblings: app.siblings.length ? String(app.siblings.length) : '',
    relatives: app.relatives.map((relative: (typeof app.relatives)[number]) => ({
      relativeType: relative.relativeType ?? 'paternal_grandfather',
      name: relative.name ?? '',
      age: relative.age?.toString() ?? '',
      monthlyIncome: relative.monthlyIncome?.toString() ?? '',
      occupation: relative.occupation ?? '',
      occupationOther: relative.occupationOther ?? '',
      supportType: relative.supportType ?? '',
      supportTypeOther: relative.supportTypeOther ?? '',
    })),
    householdAssetSelection: householdAssetRowsToSelection(
      app.householdAssets.map((asset: (typeof app.householdAssets)[number]) => ({
        assetType: asset.assetType ?? '',
        quantity: asset.quantity,
        value: asset.value,
      })),
    ),
    otherHouseholdAssets: householdAssetRowsToOtherItems(
      app.householdAssets.map((asset: (typeof app.householdAssets)[number]) => ({
        assetType: asset.assetType ?? '',
        quantity: asset.quantity,
        value: asset.value,
      })),
    ),
    monthlyMedicalExpenses: app.monthlyMedicalExpenses?.toString() ?? '',
    termsAccepted: app.termsAccepted ?? false,
    status: (app.status === 'draft' ? 'draft' : 'submitted') as 'draft' | 'submitted',
  };
  const initialDocuments: FormData['documents'] = applicationDocuments.map((document: ApplicationDocumentView) => ({
    id: document.id,
    documentType: document.documentType,
    fileUrl: document.fileUrl ?? '',
    mimeType: document.mimeType,
    size: document.size,
    fileKey: document.fileKey,
  }));

  return (
    <AppShell
      title="Edit Orphan Application"
      description={`Update draft information and save changes for application ${application.registrationNumber ?? application.id}.`}
      maxWidth="max-w-6xl"
    >
      <OrphanApplicationWizard
        initialData={initialData}
        initialDocuments={initialDocuments}
        initialApplicationId={application.id}
      />
    </AppShell>
  );
}
