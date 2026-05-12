import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';

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
      documents: true,
    },
  });

  if (!application) {
    notFound();
  }

  if (application.createdById !== session.user.id && session.user.role !== 'admin') {
    notFound();
  }

  const initialData = {
    collectorName: application.collectorName ?? '',
    collectorProject: application.collectorProject ?? '',
    childName: application.childName ?? '',
    gender: application.gender ?? '',
    dateOfBirth: application.dateOfBirth ? application.dateOfBirth.toISOString().slice(0, 10) : '',
    bFormNumber: application.bFormNumber ?? '',
    birthCity: application.birthCity ?? '',
    city: application.city ?? '',
    fatherName: application.fatherName ?? '',
    fatherAge: application.fatherAge?.toString() ?? '',
    fatherOccupation: application.fatherOccupation ?? '',
    fatherMonthlyIncome: application.fatherMonthlyIncome?.toString() ?? '',
    motherName: application.motherName ?? '',
    motherAge: application.motherAge?.toString() ?? '',
    motherOccupation: application.motherOccupation ?? '',
    motherMonthlyIncome: application.motherMonthlyIncome?.toString() ?? '',
    siblings: application.siblings.map((sibling) => ({
      name: sibling.name ?? '',
      age: sibling.age?.toString() ?? '',
      education: sibling.education ?? '',
      occupation: sibling.occupation ?? '',
    })),
    relatives: application.relatives.map((relative) => ({
      relativeType: relative.relativeType ?? 'paternal_uncle',
      name: relative.name ?? '',
      age: relative.age?.toString() ?? '',
      monthlyIncome: relative.monthlyIncome?.toString() ?? '',
      occupation: relative.occupation ?? '',
      hasFamily: relative.hasFamily ?? false,
    })),
    householdAssets: application.householdAssets.map((asset) => ({
      assetType: asset.assetType ?? '',
      quantity: asset.quantity?.toString() ?? '',
      value: asset.value?.toString() ?? '',
    })),
    totalHouseholdMembers: application.totalHouseholdMembers?.toString() ?? '',
    monthlyMedicalExpenses: application.monthlyMedicalExpenses?.toString() ?? '',
    rentAmount: application.rentAmount?.toString() ?? '',
    phoneNumber: application.phoneNumber ?? '',
    propertyAddress: application.propertyAddress ?? '',
    nearestSchool: application.nearestSchool ?? '',
    collectorRemarks: application.collectorRemarks ?? '',
    status: application.status === 'draft' ? 'draft' : 'submitted',
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Edit Orphan Application</h1>
          <p className="mt-2 text-slate-600">Update draft information and save changes for application {application.registrationNumber ?? application.id}.</p>
        </div>

        <OrphanApplicationWizard
          initialData={initialData}
          initialDocuments={application.documents}
          initialApplicationId={application.id}
        />
      </div>
    </main>
  );
}
