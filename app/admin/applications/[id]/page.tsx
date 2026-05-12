import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import ApplicationStatusActions from '@/components/application-status-actions';
import ApplicationMigrationFields from '@/components/application-migration-fields';

interface AdminApplicationDetailPageProps {
  params: {
    id: string;
  };
}

function badgeClass(status: string) {
  switch (status) {
    case 'submitted':
      return 'bg-blue-100 text-blue-800';
    case 'validated':
      return 'bg-emerald-100 text-emerald-800';
    case 'migrated':
      return 'bg-violet-100 text-violet-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-800';
    case 'needs_correction':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminApplicationDetailPage({ params }: AdminApplicationDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/admin/applications/${params.id}`);
  if (session.user.role !== 'admin') redirect('/dashboard');

  const application = await prisma.orphanApplication.findUnique({
    where: { id: params.id },
    include: {
      documents: true,
      createdBy: true,
    },
  });

  if (!application) notFound();

  return (
    <AdminShell email={session.user.email}>
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Application Review</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{application.registrationNumber ?? application.id}</h1>
          <p className="mt-2 text-sm text-slate-600">Review status, migration metadata, and key registration details.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/applications" className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Back
          </Link>
          <Link href={`/applications/${application.id}/edit`} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
            Edit
          </Link>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Summary</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow label="Child" value={application.childName ?? '-'} />
              <DetailRow label="Collector" value={application.collectorName ?? '-'} />
              <DetailRow label="Created By" value={application.createdBy?.email ?? 'Unknown'} />
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badgeClass(application.status)}`}>
                  {application.status}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Migration</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badgeClass(application.migrationStatus)}`}>
                  {application.migrationStatus}
                </span>
              </div>
              <DetailRow label="Updated" value={application.updatedAt.toLocaleString()} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Registration Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailRow label="Gender" value={application.gender ?? '-'} />
              <DetailRow label="B-Form" value={application.bFormNumber ?? '-'} />
              <DetailRow label="Date of Birth" value={application.dateOfBirth?.toLocaleDateString() ?? '-'} />
              <DetailRow label="City" value={application.city ?? '-'} />
              <DetailRow label="Father" value={application.fatherName ?? '-'} />
              <DetailRow label="Mother" value={application.motherName ?? '-'} />
              <DetailRow label="Guardian" value={application.guardianName ?? '-'} />
              <DetailRow label="Guardian Contact" value={application.guardianContact ?? '-'} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
            <div className="mt-4 grid gap-3">
              {application.documents.length === 0 ? (
                <p className="text-sm text-slate-500">No uploaded documents.</p>
              ) : (
                application.documents.map((document) => (
                  <a key={document.id} href={document.fileUrl ?? '#'} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-100">
                    <div className="font-semibold text-slate-900">{document.documentType}</div>
                    <div className="text-xs text-slate-500">{document.mimeType} - {(document.size / 1024).toFixed(1)} KB</div>
                  </a>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} />
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
