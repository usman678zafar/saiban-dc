import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import ApplicationStatusActions from '@/components/application-status-actions';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationStatusLabel, badgeClass } from '@/lib/application-workflow';

interface SupervisorApplicationPageProps {
  params: {
    id: string;
  };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

export default async function SupervisorApplicationPage({ params }: SupervisorApplicationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/supervisor/applications/${params.id}`);
  if (session.user.role !== 'supervisor' && session.user.role !== 'admin') redirect('/applications');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { project: true, role: true },
  });

  const application = await prisma.orphanApplication.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true,
    },
  });

  if (!application) notFound();
  if (application.status !== 'submitted') notFound();
  if (user?.role !== 'admin' && (!user?.project || application.collectorProject !== user.project)) notFound();

  const applicationDocuments = await getApplicationDocuments(application.id);

  return (
    <AppShell
      title={application.registrationNumber ?? application.id}
      description="Check the submitted record and return it with comments or approve it for final admin review."
      maxWidth="max-w-6xl"
      actions={
        <Link href="/supervisor" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Back
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Summary</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow label="Child" value={application.childName ?? '-'} />
              <DetailRow label="Project" value={application.collectorProject ?? '-'} />
              <DetailRow label="Collector" value={application.collectorName ?? '-'} />
              <DetailRow label="Created By" value={application.createdBy?.email ?? 'Unknown'} />
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badgeClass(application.status)}`}>
                  {applicationStatusLabel(application.status)}
                </span>
              </div>
              <DetailRow label="Updated" value={application.updatedAt.toLocaleString()} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Key Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailRow label="Father" value={application.fatherName ?? '-'} />
              <DetailRow label="Mother" value={application.motherName ?? '-'} />
              <DetailRow label="Guardian" value={application.guardianName ?? '-'} />
              <DetailRow label="Guardian Contact" value={application.guardianContact ?? '-'} />
              <DetailRow label="B-Form" value={application.bFormNumber ?? '-'} />
              <DetailRow label="Address" value={application.fullAddress ?? application.residentialArea ?? '-'} />
              <DetailRow label="School" value={application.schoolName ?? '-'} />
              <DetailRow label="Health" value={application.healthStatus ?? '-'} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
            <div className="mt-4 grid gap-3">
              {applicationDocuments.length === 0 ? (
                <p className="text-sm text-slate-500">No uploaded documents.</p>
              ) : (
                applicationDocuments.map((document) => (
                  <a key={document.id} href={document.fileUrl ?? '#'} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-100">
                    <div className="font-semibold capitalize text-slate-900">{String(document.documentType).replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-500">{document.mimeType} - {(document.size / 1024).toFixed(1)} KB</div>
                  </a>
                ))
              )}
            </div>
          </section>
        </div>

        <aside>
          <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} actorRole="supervisor" />
        </aside>
      </div>
    </AppShell>
  );
}
