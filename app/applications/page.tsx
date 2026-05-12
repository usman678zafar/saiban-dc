import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import { authOptions } from '@/lib/auth';

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
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin';
  const applications = await getRecentApplications();

  return (
    <AppShell
      title="Applications"
      description="Browse recent submissions, continue drafts, and open records for review."
      maxWidth="max-w-6xl"
      actions={
        <>
          <Link href="/applications/new" className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
            New Application
          </Link>
          {isAdmin ? (
            <>
              <Link href="/api/applications/export?format=csv" className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Export CSV
              </Link>
              <Link href="/api/applications/export?format=json" className="rounded-lg bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300">
                Export JSON
              </Link>
            </>
          ) : null}
        </>
      }
    >
        <div className="grid gap-3 md:hidden">
          {applications.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              No applications found.
            </div>
          ) : (
            applications.map((application: ApplicationListItem) => (
              <Link key={application.id} href={`/applications/${application.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{application.registrationNumber}</p>
                    <p className="mt-1 text-sm text-slate-600">{application.childName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{application.status}</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">Updated {application.updatedAt}</p>
              </Link>
            ))
          )}
        </div>

        <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
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
    </AppShell>
  );
}
