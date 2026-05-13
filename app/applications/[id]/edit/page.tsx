import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import type { FormData } from '@/components/orphan-application-wizard';
import { householdAssetRowsToSelection } from '@/lib/household-assets';

interface EditApplicationPageProps {
  params: {
    id: string;
  };
}

type EditableDocument = {
  id: string;
  documentType: string;
  fileUrl: string | null;
  mimeType: string;
  size: number;
  fileKey: string;
};

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
      documents: true,
    },
  });

  if (!application) {
    notFound();
  }

  if (application.createdById !== session.user.id && session.user.role !== 'admin') {
    notFound();
  }

  const app = application as any;
  const initialData: Partial<FormData> = {
    collectorName: app.collectorName ?? '',
    collectorProject: app.collectorProject ?? '',
    childName: app.childName ?? '',
    gender: app.gender ?? '',
    dateOfBirth: app.dateOfBirth ? app.dateOfBirth.toISOString().slice(0, 10) : '',
    bFormNumber: app.bFormNumber ?? '',
    city: app.city ?? '',
    fatherName: app.fatherName ?? '',
    fatherAge: app.fatherAge?.toString() ?? '',
    fatherOccupation: app.fatherOccupation ?? '',
    motherName: app.motherName ?? '',
    motherAge: app.motherAge?.toString() ?? '',
    motherAlive: app.motherAlive ?? '',
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
    guardianCnic: app.guardianCnic ?? '',
    guardianContact: app.guardianContact ?? '',
    guardianZakatStatus: app.guardianZakatStatus ?? '',
    guardianOccupation: app.guardianOccupation ?? '',
    guardianFamilyHolder: app.guardianFamilyHolder ?? '',
    guardianFamilyHolderAmount: app.guardianFamilyHolderAmount?.toString() ?? '',
    guardianFamilyMembersCount: app.guardianFamilyMembersCount?.toString() ?? '',
    guardianMonthlyIncome: app.guardianMonthlyIncome?.toString() ?? '',
    houseOwnershipStatus: app.houseOwnershipStatus ?? '',
    monthlyRent: app.monthlyRent?.toString() ?? '',
    rentPaidBy: app.rentPaidBy ?? '',
    houseOwner: app.houseOwner ?? '',
    houseCondition: app.houseCondition ?? '',
    houseConditionRemarks: app.houseConditionRemarks ?? '',
    furnishingCondition: app.furnishingCondition ?? '',
    furnishingConditionRemarks: app.furnishingConditionRemarks ?? '',
    healthStatus: app.healthStatus ?? '',
    disabilityDetails: app.disabilityDetails ?? '',
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
    receivingOtherAid: app.receivingOtherAid ?? false,
    otherAidSource: app.otherAidSource ?? '',
    monthlyAidAmount: app.monthlyAidAmount?.toString() ?? '',
    siblings: app.siblings.map((sibling: (typeof app.siblings)[number]) => ({
      name: sibling.name ?? '',
      age: sibling.age?.toString() ?? '',
      occupation: sibling.occupation ?? '',
      monthlyIncomeOrFee: sibling.monthlyIncomeOrFee?.toString() ?? '',
    })),
    relatives: app.relatives.map((relative: (typeof app.relatives)[number]) => ({
      relativeType: relative.relativeType ?? 'paternal_uncle',
      name: relative.name ?? '',
      age: relative.age?.toString() ?? '',
      monthlyIncome: relative.monthlyIncome?.toString() ?? '',
      occupation: relative.occupation ?? '',
    })),
    householdAssetSelection: householdAssetRowsToSelection(
      app.householdAssets.map((asset: (typeof app.householdAssets)[number]) => ({
        assetType: asset.assetType ?? '',
        quantity: asset.quantity,
        value: asset.value,
      })),
    ),
    monthlyMedicalExpenses: app.monthlyMedicalExpenses?.toString() ?? '',
    status: (app.status === 'draft' ? 'draft' : 'submitted') as 'draft' | 'submitted',
  };
  const initialDocuments: FormData['documents'] = application.documents.map((document: EditableDocument) => ({
    id: document.id,
    documentType: document.documentType,
    fileUrl: document.fileUrl ?? '',
    mimeType: document.mimeType,
    size: document.size,
    fileKey: document.fileKey,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Edit Orphan Application</h1>
          <p className="mt-2 text-slate-600">Update draft information and save changes for application {application.registrationNumber ?? application.id}.</p>
        </div>

        <OrphanApplicationWizard
          initialData={initialData}
          initialDocuments={initialDocuments}
          initialApplicationId={application.id}
        />
      </div>
    </main>
  );
}
