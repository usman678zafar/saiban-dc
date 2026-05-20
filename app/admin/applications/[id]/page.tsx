import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CopyPlus } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import ApplicationStatusActions from '@/components/application-status-actions';
import ApplicationMigrationFields from '@/components/application-migration-fields';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';

interface AdminApplicationDetailPageProps {
  params: {
    id: string;
  };
}

export default async function AdminApplicationDetailPage({ params }: AdminApplicationDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/admin/applications/${params.id}`);
  if (session.user.role !== 'admin') redirect('/dashboard');

  const application = await prisma.orphanApplication.findFirst({
    where: {
      id: params.id,
      status: { in: ['submitted', 'supervisor_approved', 'admin_approved', 'validated', 'rejected', 'migrated'] },
    },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
    },
  });

  if (!application) notFound();

  const applicationDocuments = await getApplicationDocuments(application.id);

  return (
    <AdminShell email={session.user.email}>
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{application.registrationNumber ?? application.id}</h1>
          <p className="mt-2 text-sm text-slate-600">Review the application in the same step-by-step format used during form entry.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/applications" className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Back
          </Link>
          <Link href={`/applications/${application.id}/duplicate`} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100">
            <CopyPlus className="h-4 w-4" aria-hidden="true" />
            Add Child Same Family
          </Link>
          <Link href={`/applications/${application.id}/edit`} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
            Edit
          </Link>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OrphanApplicationWizard
          initialData={applicationToWizardData(application)}
          initialDocuments={documentsToWizardDocuments(applicationDocuments)}
          initialApplicationId={application.id}
          readOnly
        />

        <aside className="space-y-6">
          <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} actorRole="admin" />
          <ApplicationMigrationFields
            applicationId={application.id}
            initialMigrationStatus={application.migrationStatus}
            initialMainSaibanId={application.mainSaibanId ?? ''}
            initialMigrationErrors={application.migrationErrors ?? ''}
          />
        </aside>
      </div>
    </AdminShell>
  );
}

