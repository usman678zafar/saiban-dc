import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ApplicationStatusActions from '@/components/application-status-actions';
import ApplicationMigrationFields from '@/components/application-migration-fields';

function badgeClass(status: string) {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-800';
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

interface ApplicationDetailPageProps {
  params: {
    id: string;
  };
}

type SiblingRecord = {
  name: string | null;
  age: number | null;
  occupation: string | null;
};

type RelativeRecord = {
  relativeType: string;
  name: string | null;
  age: number | null;
  monthlyIncome: number | null;
};

type HouseholdAssetRecord = {
  assetType: string;
  quantity: number | null;
  value: number | null;
};

type ApplicationDocumentRecord = {
  id: string;
  documentType: string;
  fileUrl: string | null;
  mimeType: string;
  size: number;
};

type DataGridItem = {
  label: string;
  value: string;
};

type DocumentItem = {
  id: string;
  documentType: string;
  fileUrl: string;
  mimeType: string;
  sizeInKb: string;
};

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
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
      createdBy: true,
      updatedBy: true,
    },
  });

  if (!application) {
    notFound();
  }

  const isAdmin = session.user.role === 'admin';
  const canEdit = application.status === 'draft' || isAdmin;
  const siblingItems: DataGridItem[] = application.siblings.map((sibling: SiblingRecord) => ({
    label: sibling.name ?? 'Unnamed',
    value: `${sibling.age ?? '-'} years - ${sibling.occupation ?? 'No occupation'}`,
  }));
  const relativeItems: DataGridItem[] = application.relatives.map((relative: RelativeRecord) => ({
    label: `${relative.relativeType.replace('_', ' ')} - ${relative.name ?? '-'}`,
    value: `${relative.age ?? '-'} years - ${relative.monthlyIncome ?? '-'} PKR`,
  }));
  const householdAssetItems: DataGridItem[] = application.householdAssets.map((asset: HouseholdAssetRecord) => ({
    label: asset.assetType,
    value: `${asset.quantity ?? '-'} units - ${asset.value ?? '-'} PKR`,
  }));
  const documentItems: DocumentItem[] = application.documents.map((document: ApplicationDocumentRecord) => ({
    id: document.id,
    documentType: document.documentType,
    fileUrl: document.fileUrl ?? '#',
    mimeType: document.mimeType,
    sizeInKb: (document.size / 1024).toFixed(1),
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Application Details</h1>
            <p className="mt-2 text-slate-600">Review application status, migration metadata, and supporting documents.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/applications" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Back to list
            </Link>
            {canEdit ? (
              <Link href={`/applications/${application.id}/edit`} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                Edit Draft
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Application Summary</h2>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailRow label="Registration" value={application.registrationNumber ?? application.id} />
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                    <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badgeClass(application.status)}`}>
                      {application.status}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Migration</p>
                    <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badgeClass(application.migrationStatus)}`}>
                      {application.migrationStatus}
                    </div>
                  </div>
                  <DetailRow label="Created By" value={application.createdBy?.email ?? 'Unknown'} />
                  <DetailRow label="Updated At" value={new Date(application.updatedAt).toLocaleString()} />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Application Details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <DetailRow label="Collector" value={application.collectorName ?? '-'} />
                <DetailRow label="Project" value={application.collectorProject ?? '-'} />
                <DetailRow label="Child" value={application.childName ?? '-'} />
                <DetailRow label="Gender" value={application.gender ?? '-'} />
                <DetailRow label="B-Form" value={application.bFormNumber ?? '-'} />
                <DetailRow label="City" value={application.city ?? '-'} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Related Records</h2>
              <div className="mt-4 space-y-6">
                <DataGrid title="Siblings" items={siblingItems} />
                <DataGrid title="Relatives" items={relativeItems} />
                <DataGrid title="Household Assets" items={householdAssetItems} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
              <div className="mt-4 grid gap-3">
                {application.documents.length === 0 ? (
                  <p className="text-sm text-slate-500">No uploaded documents.</p>
                ) : (
                  documentItems.map((doc: DocumentItem) => (
                    <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-100">
                      <div className="font-semibold text-slate-900">{doc.documentType}</div>
                      <div className="text-xs text-slate-500">{doc.mimeType} - {doc.sizeInKb} KB</div>
                    </a>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            {isAdmin ? <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} /> : null}
            {isAdmin ? (
              <ApplicationMigrationFields
                applicationId={application.id}
                initialMigrationStatus={application.migrationStatus}
                initialMainSaibanId={application.mainSaibanId ?? ''}
                initialMigrationErrors={application.migrationErrors ?? ''}
              />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DataGrid({ title, items }: { title: string; items: DataGridItem[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">None</p>
        ) : (
          items.map((item: DataGridItem, index: number) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="text-sm text-slate-600">{item.value}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
