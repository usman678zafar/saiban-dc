import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

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

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin';
  const user = session?.user?.email
    ? await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    : null;
  const where = isAdmin ? undefined : { createdById: user?.id ?? '' };

  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [records, total] = await Promise.all([
    prisma.orphanApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        registrationNumber: true,
        childName: true,
        status: true,
        updatedAt: true,
      },
    }) as Promise<ApplicationListRecord[]>,
    prisma.orphanApplication.count({ where }),
  ]);

  const applications: ApplicationListItem[] = records.map((application) => ({
    id: application.id,
    registrationNumber: application.registrationNumber ?? application.id,
    childName: application.childName ?? 'No child name',
    status: application.status,
    updatedAt: application.updatedAt.toLocaleDateString(),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <AppShell
      title="Applications"
      description="Browse recent submissions, continue drafts, and open records for review."
      maxWidth="max-w-6xl"
      actions={
        <>
          <Link href="/applications/new" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 sm:w-auto">
            New Application
          </Link>
          {isAdmin ? (
            <>
              <Link href="/api/applications/export?format=csv" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto">
                Export CSV
              </Link>
              <Link href="/api/applications/export?format=json" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300 sm:w-auto">
                Export JSON
              </Link>
            </>
          ) : null}
        </>
      }
    >
      <div className="grid min-w-0 gap-3 md:hidden">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-sm">
          {total === 0 ? 'No records' : `Showing ${skip + 1}-${Math.min(skip + PAGE_SIZE, total)} of ${total}`}
        </div>
        {applications.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            No applications found.
          </div>
        ) : (
          applications.map((application: ApplicationListItem) => (
            <article key={application.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]">{application.registrationNumber}</p>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">{application.childName}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{application.status}</span>
                  <span className="text-xs text-slate-500">Updated {application.updatedAt}</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href={`/applications/${application.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200">
                  View
                </Link>
                {application.status === 'draft' ? (
                  <Link href={`/applications/${application.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                    Edit
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-300">
                    Edit
                  </span>
                )}
              </div>
            </article>
          ))
        )}
        <MobilePagination page={page} hasPrev={hasPrev} hasNext={hasNext} totalPages={totalPages} />
      </div>

      <div className="hidden min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
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
                  <td className="max-w-[420px] px-4 py-4 align-top">
                    <div className="break-words font-semibold text-slate-900 [overflow-wrap:anywhere]">{application.registrationNumber}</div>
                    <div className="mt-1 break-words text-xs text-slate-500 [overflow-wrap:anywhere]">{application.childName}</div>
                  </td>
                  <td className="px-4 py-4 align-top capitalize text-slate-700">{application.status}</td>
                  <td className="px-4 py-4 align-top text-slate-500">{application.updatedAt}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                    <Link href={`/applications/${application.id}`} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200">
                      View
                    </Link>
                    {application.status === 'draft' ? (
                      <Link href={`/applications/${application.id}/edit`} className="rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">
                        Edit
                      </Link>
                    ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{total === 0 ? 'No records' : `Showing ${skip + 1}–${Math.min(skip + PAGE_SIZE, total)} of ${total}`}</span>
          <div className="flex gap-2">
            {hasPrev ? (
              <Link href={`/applications?page=${page - 1}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-300">Previous</span>
            )}
            {hasNext ? (
              <Link href={`/applications?page=${page + 1}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-300">Next</span>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MobilePagination({ page, hasPrev, hasNext, totalPages }: { page: number; hasPrev: boolean; hasNext: boolean; totalPages: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 text-center text-xs font-semibold text-slate-500">
        Page {page} of {totalPages}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {hasPrev ? (
          <Link href={`/applications?page=${page - 1}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Previous
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-300">Previous</span>
        )}
        {hasNext ? (
          <Link href={`/applications?page=${page + 1}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Next
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-300">Next</span>
        )}
      </div>
    </div>
  );
}
