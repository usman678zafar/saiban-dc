import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AppShell from '@/components/app-shell';
import AdminShell from '@/components/admin-shell';
import SupervisorShell from '@/components/supervisor-shell';
import BackButton from '@/components/back-button';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';

interface EditApplicationPageProps {
  params: {
    id: string;
  };
}

export default async function EditApplicationPage({ params }: EditApplicationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/signin?callbackUrl=/applications/${params.id}/edit`);
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

  const canReviewerEdit = session.user.role === 'reviewer' && application.status === 'supervisor_approved';
  const canAdminEdit = session.user.role === 'admin' && application.status === 'reviewer_approved';
  const canSuperAdminEdit = session.user.role === 'super_admin';
  const canCreateApplications = session.user.role === 'field_worker'
    || session.user.role === 'admin'
    || session.user.role === 'super_admin'
    || ((session.user.role === 'supervisor' || session.user.role === 'reviewer') && Boolean(session.user.canCreateApplications));
  const canOwnerEdit = session.user.role !== 'admin' && application.createdById === session.user.id && canCreateApplications;

  if (!canOwnerEdit && !canReviewerEdit && !canAdminEdit && !canSuperAdminEdit) {
    notFound();
  }

  if (canOwnerEdit && !['draft', 'needs_correction'].includes(application.status) && session.user.role !== 'super_admin') {
    redirect(`/applications/${application.id}`);
  }

  const applicationDocuments = await getApplicationDocuments(application.id);
  const initialData = applicationToWizardData(application);
  const initialDocuments = documentsToWizardDocuments(applicationDocuments);
  const content = (
    <OrphanApplicationWizard
      initialData={initialData}
      initialDocuments={initialDocuments}
      initialApplicationId={application.id}
      editCommentRequired={canAdminEdit}
    />
  );
  const backFallbackHref = session.user.role === 'admin' || session.user.role === 'super_admin'
    ? `/admin/applications/${application.id}`
    : session.user.role === 'reviewer'
      ? `/reviewer/applications/${application.id}`
      : session.user.role === 'supervisor'
        ? `/applications/${application.id}`
        : `/applications/${application.id}`;
  const backButton = (
    <BackButton
      fallbackHref={backFallbackHref}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
    >
      Back
    </BackButton>
  );

  if (session.user.role === 'supervisor') {
    return (
      <SupervisorShell
        email={session.user.email}
        name={session.user.name}
        canCreateApplications={Boolean(session.user.canCreateApplications)}
        canManageFieldWorkers={Boolean(session.user.canManageFieldWorkers)}
      >
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Edit Orphan Application</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a]">
              {canAdminEdit
                ? `Update this pending admin review application and add a compulsory edit comment for ${application.registrationNumber ?? application.id}.`
                : `Update draft information and save changes for application ${application.registrationNumber ?? application.id}.`}
            </p>
          </div>
          {backButton}
        </header>
        {content}
      </SupervisorShell>
    );
  }

  if (session.user.role === 'admin' || session.user.role === 'super_admin') {
    return (
      <AdminShell email={session.user.email} role={session.user.role}>
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Edit Orphan Application</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a]">
              Update draft information and save changes for application {application.registrationNumber ?? application.id}.
            </p>
          </div>
          {backButton}
        </header>
        {content}
      </AdminShell>
    );
  }

  return (
    <AppShell
      title="Edit Orphan Application"
      description={`Update draft information and save changes for application ${application.registrationNumber ?? application.id}.`}
      maxWidth="max-w-6xl"
      actions={backButton}
    >
      {content}
    </AppShell>
  );
}

