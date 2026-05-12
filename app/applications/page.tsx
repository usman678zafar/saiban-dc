import Link from 'next/link';
import { prisma } from '@/lib/prisma';

type ApplicationListRecord = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: string;
  updatedAt: Date;
};

type ApplicationListItem = {
  id: string;
  registrationNumber: string;
  childName: string;
  status: string;
  updatedAt: string;
};

async function getRecentApplications(): Promise<ApplicationListItem[]> {
  const applications = await prisma.orphanApplication.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      registrationNumber: true,
      childName: true,
      status: true,
      updatedAt: true,
    },
  }) as ApplicationListRecord[];

  return applications.map((application: ApplicationListRecord) => ({
    id: application.id,
    registrationNumber: application.registrationNumber ?? application.id,
    childName: application.childName ?? 'No child name',
    status: application.status,
    updatedAt: application.updatedAt.toLocaleDateString(),
  }));
}

export default async function ApplicationsPage() {
  const applications = await getRecentApplications();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Applications</h1>
            <p className="mt-2 text-slate-600">Browse recent orphan registration submissions and manage status.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/applications/new" className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              New Application
            </Link>
            <Link href="/api/applications/export?format=csv" className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Export CSV
            </Link>
            <Link href="/api/applications/export?format=json" className="inline-flex items-center rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-300">
              Export JSON
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No applications found.
                  </td>
                </tr>
              ) : (
                applications.map((application: ApplicationListItem) => (
                  <tr key={application.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{application.registrationNumber}</div>
                      <div className="text-xs text-slate-500">{application.childName}</div>
                    </td>
                    <td className="px-4 py-4 capitalize text-slate-700">{application.status}</td>
                    <td className="px-4 py-4 text-slate-500">{application.updatedAt}</td>
                    <td className="px-4 py-4">
                      <Link href={`/applications/${application.id}`} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
