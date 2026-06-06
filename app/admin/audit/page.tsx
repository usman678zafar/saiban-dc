import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { Activity, ClipboardList, Search, Settings2, ShieldCheck, X } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const sourceOptions = ['all', 'system', 'application'] as const;
const roleOptions = ['all', 'super_admin', 'admin', 'reviewer', 'supervisor', 'field_worker'] as const;
const entityOptions = ['all', 'application', 'supervisor', 'field_worker', 'reviewer', 'admin', 'department'] as const;

type AuditSource = (typeof sourceOptions)[number];
type RoleFilter = (typeof roleOptions)[number];
type EntityFilter = (typeof entityOptions)[number];

type AuditItem = {
  id: string;
  source: 'system' | 'application';
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actorLabel: string;
  actorRole: string | null;
  details: unknown;
  createdAt: Date;
  href: string | null;
};

const sourceLabels: Record<AuditSource, string> = {
  all: 'All sources',
  system: 'Management',
  application: 'Applications',
};

const entityLabels: Record<EntityFilter, string> = {
  all: 'All entities',
  application: 'Applications',
  supervisor: 'Supervisors',
  field_worker: 'Field workers',
  reviewer: 'Reviewers',
  admin: 'Admins',
  department: 'Departments',
};

const roleLabels: Record<RoleFilter, string> = {
  all: 'All actors',
  super_admin: 'Super admins',
  admin: 'Admins',
  reviewer: 'Reviewers',
  supervisor: 'Supervisors',
  field_worker: 'Field workers',
};

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function sourceFilter(value?: string): AuditSource {
  return sourceOptions.includes(value as AuditSource) ? value as AuditSource : 'all';
}

function roleFilter(value?: string): RoleFilter {
  return roleOptions.includes(value as RoleFilter) ? value as RoleFilter : 'all';
}

function entityFilter(value?: string): EntityFilter {
  return entityOptions.includes(value as EntityFilter) ? value as EntityFilter : 'all';
}

function detailsObject(details: unknown) {
  return details && typeof details === 'object' && !Array.isArray(details) ? details as Record<string, unknown> : {};
}

function actorLabel(actor?: { name: string | null; email?: string | null; phoneNumber?: string | null; role: string; fieldWorkerId?: string | null } | null, fallbackRole?: string | null) {
  if (!actor) return fallbackRole?.replace(/_/g, ' ') ?? 'System';
  return actor.name || actor.phoneNumber || actor.email || actor.fieldWorkerId || actor.role.replace(/_/g, ' ');
}

function readableAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readableEntity(entityType: string) {
  return entityType.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function roleLabel(role: string | null) {
  return role ? role.replace(/_/g, ' ') : 'System';
}

function managementHref(entityType: string) {
  switch (entityType) {
    case 'supervisor':
      return '/admin/supervisors';
    case 'field_worker':
      return '/admin/field-workers';
    case 'reviewer':
      return '/admin/reviewers';
    case 'admin':
      return '/admin/admins';
    case 'department':
      return '/admin/projects';
    case 'application':
      return '/admin/applications?status=all';
    default:
      return null;
  }
}

function detailsSummary(details: unknown) {
  const object = detailsObject(details);
  const parts = Object.entries(object)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 5)
    .map(([key, value]) => {
      const displayValue = Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `${readableAction(key)}: ${displayValue}`;
    });
  return parts.join(' | ');
}

function buildHref(params: {
  q: string;
  source: AuditSource;
  entity: EntityFilter;
  role: RoleFilter;
  action: string;
  page?: number;
}) {
  const next = new URLSearchParams();
  if (params.q) next.set('q', params.q);
  if (params.source !== 'all') next.set('source', params.source);
  if (params.entity !== 'all') next.set('entity', params.entity);
  if (params.role !== 'all') next.set('role', params.role);
  if (params.action) next.set('action', params.action);
  if ((params.page ?? 1) > 1) next.set('page', String(params.page));
  const query = next.toString();
  return query ? `/admin/audit?${query}` : '/admin/audit';
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    source?: string;
    entity?: string;
    role?: string;
    action?: string;
    page?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/audit');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');

  const q = searchParams.q?.trim() ?? '';
  const source = sourceFilter(searchParams.source);
  const entity = entityFilter(searchParams.entity);
  const role = roleFilter(searchParams.role);
  const action = searchParams.action?.trim() ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const take = PAGE_SIZE * page;
  const systemAuditLogDelegate = (prisma as typeof prisma & { systemAuditLog?: typeof prisma.systemAuditLog }).systemAuditLog;
  const systemAuditAvailable = Boolean(systemAuditLogDelegate);

  const systemWhere: Prisma.SystemAuditLogWhereInput = {
    ...(entity !== 'all' ? { entityType: entity } : {}),
    ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
    ...(role !== 'all' ? { actorRole: role } : {}),
    ...(q ? {
      OR: [
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { entityLabel: { contains: q, mode: 'insensitive' } },
        { actor: { is: { name: { contains: q, mode: 'insensitive' } } } },
        { actor: { is: { email: { contains: q, mode: 'insensitive' } } } },
        { actor: { is: { phoneNumber: { contains: q, mode: 'insensitive' } } } },
      ],
    } : {}),
  };

  const applicationWhere: Prisma.AuditLogWhereInput = {
    ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
    ...(role !== 'all' ? { actor: { role } } : {}),
    ...(q ? {
      OR: [
        { action: { contains: q, mode: 'insensitive' } },
        { recordId: { contains: q, mode: 'insensitive' } },
        { actor: { name: { contains: q, mode: 'insensitive' } } },
        { actor: { email: { contains: q, mode: 'insensitive' } } },
        { actor: { phoneNumber: { contains: q, mode: 'insensitive' } } },
        { application: { registrationNumber: { contains: q, mode: 'insensitive' } } },
        { application: { childName: { contains: q, mode: 'insensitive' } } },
      ],
    } : {}),
  };

  const [systemLogs, applicationLogs, systemTotal, applicationTotal] = await Promise.all([
    source !== 'application' && systemAuditLogDelegate
      ? systemAuditLogDelegate.findMany({
        where: systemWhere,
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          entityLabel: true,
          actorRole: true,
          details: true,
          createdAt: true,
          actor: {
            select: {
              name: true,
              email: true,
              phoneNumber: true,
              role: true,
              fieldWorkerId: true,
            },
          },
        },
      })
      : Promise.resolve([]),
    source !== 'system' && (entity === 'all' || entity === 'application')
      ? prisma.auditLog.findMany({
        where: applicationWhere,
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          action: true,
          recordId: true,
          details: true,
          createdAt: true,
          actor: {
            select: {
              name: true,
              email: true,
              phoneNumber: true,
              role: true,
              fieldWorkerId: true,
            },
          },
          application: {
            select: {
              id: true,
              registrationNumber: true,
              childName: true,
            },
          },
        },
      })
      : Promise.resolve([]),
    source !== 'application' && systemAuditLogDelegate ? systemAuditLogDelegate.count({ where: systemWhere }) : Promise.resolve(0),
    source !== 'system' && (entity === 'all' || entity === 'application') ? prisma.auditLog.count({ where: applicationWhere }) : Promise.resolve(0),
  ]);

  const items: AuditItem[] = [
    ...systemLogs.map((log) => ({
      id: `system-${log.id}`,
      source: 'system' as const,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityLabel: log.entityLabel,
      actorLabel: actorLabel(log.actor, log.actorRole),
      actorRole: log.actorRole,
      details: log.details,
      createdAt: log.createdAt,
      href: managementHref(log.entityType),
    })),
    ...applicationLogs.map((log) => ({
      id: `application-${log.id}`,
      source: 'application' as const,
      action: log.action,
      entityType: 'application',
      entityId: log.application.id,
      entityLabel: log.application.registrationNumber ?? log.application.childName ?? log.recordId,
      actorLabel: actorLabel(log.actor),
      actorRole: log.actor.role,
      details: log.details,
      createdAt: log.createdAt,
      href: `/admin/applications/${log.application.id}`,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = systemTotal + applicationTotal;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const activeFilterCount = [q, source !== 'all', entity !== 'all', role !== 'all', action].filter(Boolean).length;
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);
  const recentItem = items[0];

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Audit Trail</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a]">
            Review application workflow activity and management changes across departments, users, supervisors, reviewers, and field workers.
          </p>
        </div>
        <div className="rounded-xl border border-[#dbe4ef] bg-white px-4 py-3 text-sm text-[#5f718a]">
          <span className="font-semibold text-[#0f1f33]">{activeFilterCount}</span> active filters
        </div>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe4ef] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#edf4ff] text-[#2563eb]">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none text-[#0f1f33]">{total}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9bb3]">Matching events</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#dbe4ef] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#f0f7ff] text-[#0284c7]">
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none text-[#0f1f33]">{systemTotal}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9bb3]">Management</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#dbe4ef] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#edf8f2] text-[#059669]">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none text-[#0f1f33]">{applicationTotal}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9bb3]">Applications</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#dbe4ef] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#fff7ed] text-[#ea580c]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0f1f33]">{recentItem ? dateTimeFormatter.format(recentItem.createdAt) : '-'}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9bb3]">Latest event</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-[#dbe4ef] bg-white p-4 shadow-sm sm:p-5">
        {!systemAuditAvailable ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Management audit logs are not available in this running server process yet. Restart the server after Prisma generation to load the audit model.
          </div>
        ) : null}
        <form className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_180px_minmax(150px,180px)_auto]" action="/admin/audit">
          <label className="relative block min-w-0">
            <span className="sr-only">Search audit trail</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9bb3]" aria-hidden="true" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search actor, action, record, application"
              className="w-full rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] py-3 pl-10 pr-4 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
            />
          </label>
          <select name="source" defaultValue={source} className="rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] px-4 py-3 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]">
            {sourceOptions.map((option) => (
              <option key={option} value={option}>{sourceLabels[option]}</option>
            ))}
          </select>
          <select name="entity" defaultValue={entity} className="rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] px-4 py-3 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]">
            {entityOptions.map((option) => (
              <option key={option} value={option}>{entityLabels[option]}</option>
            ))}
          </select>
          <select name="role" defaultValue={role} className="rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] px-4 py-3 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]">
            {roleOptions.map((option) => (
              <option key={option} value={option}>{roleLabels[option]}</option>
            ))}
          </select>
          <input
            name="action"
            defaultValue={action}
            placeholder="Action"
            className="rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] px-4 py-3 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
          />
          <button type="submit" className="rounded-xl bg-[#0f1f33] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1f2f46]">
            Filter
          </button>
        </form>
        {q || source !== 'all' || entity !== 'all' || role !== 'all' || action ? (
          <Link href="/admin/audit" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#dbe4ef] px-3 py-2 text-xs font-semibold text-[#506784] hover:bg-[#f6f9fd]">
            <X className="h-4 w-4" aria-hidden="true" />
            Clear filters
          </Link>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <div className="flex flex-col gap-1 border-b border-[#edf2f7] bg-[#fbfdff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#0f1f33]">Audit events</p>
          <p className="text-sm text-[#5f718a]">
            {total === 0 ? 'No audit events found.' : `Showing ${pageStart}-${pageEnd} of ${total}`}
          </p>
        </div>
        <div className="divide-y divide-[#edf2f7]">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a9bb3]">No audit events match these filters.</p>
          ) : (
            items.map((item) => {
              const summary = detailsSummary(item.details);
              return (
                <article key={item.id} className="grid gap-3 px-4 py-4 transition hover:bg-[#f8fbff] lg:grid-cols-[210px_minmax(0,1fr)_220px] lg:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9bb3]">{sourceLabels[item.source]}</p>
                    <p className="mt-1 text-sm font-semibold text-[#0f1f33]">{dateTimeFormatter.format(item.createdAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#edf4ff] px-2.5 py-1 text-xs font-semibold text-[#2563eb]">{readableEntity(item.entityType)}</span>
                      <h2 className="break-words text-sm font-semibold text-[#0f1f33] [overflow-wrap:anywhere]">{readableAction(item.action)}</h2>
                    </div>
                    <p className="mt-1 break-words text-sm text-[#5f718a] [overflow-wrap:anywhere]">
                      {item.entityLabel ?? item.entityId ?? 'No record label'}
                    </p>
                    {summary ? <p className="mt-2 break-words rounded-lg bg-[#f6f9fd] px-3 py-2 text-xs leading-5 text-[#506784] [overflow-wrap:anywhere]">{summary}</p> : null}
                    {item.href ? (
                      <Link href={item.href} className="mt-2 inline-flex text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
                        {item.source === 'application' ? 'Open application' : 'Open section'}
                      </Link>
                    ) : null}
                  </div>
                  <div className="text-sm text-[#5f718a] lg:text-right">
                    <p className="font-semibold text-[#0f1f33]">{item.actorLabel}</p>
                    <p className="mt-1 text-xs capitalize text-[#8a9bb3]">{roleLabel(item.actorRole)}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <nav className="mt-4 flex flex-col gap-3 rounded-xl border border-[#dbe4ef] bg-white p-3 text-sm text-[#5f718a] sm:flex-row sm:items-center sm:justify-between sm:p-4" aria-label="Audit pagination">
        <span className="text-center sm:text-left">Page {page} of {totalPages}</span>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {hasPrev ? (
            <Link href={buildHref({ q, source, entity, role, action, page: page - 1 })} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#dbe4ef] px-3 py-2 text-xs font-semibold text-[#0f1f33] hover:bg-[#f6f9fd]">
              Previous
            </Link>
          ) : (
            <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#edf2f7] px-3 py-2 text-xs font-semibold text-[#b8c4d4]">Previous</span>
          )}
          {hasNext ? (
            <Link href={buildHref({ q, source, entity, role, action, page: page + 1 })} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#dbe4ef] px-3 py-2 text-xs font-semibold text-[#0f1f33] hover:bg-[#f6f9fd]">
              Next
            </Link>
          ) : (
            <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#edf2f7] px-3 py-2 text-xs font-semibold text-[#b8c4d4]">Next</span>
          )}
        </div>
      </nav>
    </AdminShell>
  );
}
