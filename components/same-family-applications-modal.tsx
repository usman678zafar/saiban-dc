'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Baby, Check, PauseCircle, RotateCcw, UsersRound, X } from 'lucide-react';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { formatCnic } from '@/lib/contact-format';
import { formatDate } from '@/lib/date-format';
import type { SameFamilyApplicationListItem } from '@/lib/same-family-applications';

type AdminActorRole = 'admin' | 'super_admin';
type ModalAction = 'approve' | 'hold' | 'return' | 'reject';

type SameFamilyApplicationsModalProps = {
  applications: SameFamilyApplicationListItem[];
  currentApplicationId: string;
  hrefPrefix: string;
  actorRole: AdminActorRole;
  triggerClassName?: string;
  triggerLabel?: string;
};

const statusTone: Record<string, string> = {
  admin_on_hold: 'bg-amber-100 text-amber-800',
  admin_approved: 'bg-emerald-100 text-emerald-800',
  validated: 'bg-emerald-100 text-emerald-800',
  migrated: 'bg-slate-100 text-slate-700',
  rejected: 'bg-rose-100 text-rose-800',
  reviewer_approved: 'bg-blue-100 text-blue-800',
};

function text(value: string | null | undefined) {
  return value?.trim() || '-';
}

function cnic(value: string | null | undefined) {
  const next = value?.trim();
  return next ? formatCnic(next) : '-';
}

function guardianCnic(application: SameFamilyApplicationListItem) {
  return application.motherIsGuardian === 'yes' ? cnic(application.motherCnic) : cnic(application.guardianCnic);
}

function guardianName(application: SameFamilyApplicationListItem) {
  return application.motherIsGuardian === 'yes' ? 'Mother is guardian' : text(application.guardianName);
}

function canUseAdminFinalActions(status: string) {
  return status === 'reviewer_approved' || status === 'admin_on_hold' || status === 'admin_approved';
}

function actionGridClass(status: string) {
  return status === 'reviewer_approved' ? 'grid-cols-2' : 'grid-cols-3';
}

const reviewLinkClass = 'inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700';
const modalActionButtonClass = 'inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60';

function actionTitle(action: ModalAction, isApproved = false) {
  switch (action) {
    case 'approve':
      return 'Approve this application?';
    case 'hold':
      return isApproved ? 'Change approved application to on hold' : 'Put this application on hold';
    case 'return':
      return isApproved ? 'Return this approved application' : 'Return this application';
    case 'reject':
      return isApproved ? 'Reject this approved application' : 'Reject this application?';
  }
}

function actionStatus(action: ModalAction, returnTo: 'reviewer' | 'supervisor') {
  if (action === 'approve') return 'admin_approved';
  if (action === 'hold') return 'admin_on_hold';
  if (action === 'reject') return 'rejected';
  return returnTo === 'supervisor' ? 'submitted' : 'supervisor_approved';
}

export default function SameFamilyApplicationsModal({
  applications,
  currentApplicationId,
  hrefPrefix,
  actorRole,
  triggerClassName,
  triggerLabel,
}: SameFamilyApplicationsModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(applications);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; action: ModalAction } | null>(null);
  const [comment, setComment] = useState('');
  const [returnTo, setReturnTo] = useState<'reviewer' | 'supervisor'>('reviewer');

  const youngestKnownAge = useMemo(() => {
    const ages = items.map((item) => item.age).filter((age): age is number => typeof age === 'number');
    return ages.length ? Math.min(...ages) : null;
  }, [items]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aAge = typeof a.age === 'number' ? a.age : Number.POSITIVE_INFINITY;
      const bAge = typeof b.age === 'number' ? b.age : Number.POSITIVE_INFINITY;
      if (aAge !== bAge) return aAge - bAge;
      return text(a.childName).localeCompare(text(b.childName));
    });
  }, [items]);

  const resetAction = () => {
    setPending(null);
    setComment('');
    setReturnTo('reviewer');
  };

  const beginAction = (id: string, action: Exclude<ModalAction, 'approve'>) => {
    setPending({ id, action });
    setComment('');
    if (action === 'return') setReturnTo('reviewer');
  };

  const submitAction = async (application: SameFamilyApplicationListItem, action: ModalAction) => {
    const isChangingApprovedDecision = application.status === 'admin_approved';
    const needsComment = action === 'hold' || action === 'return' || (isChangingApprovedDecision && action === 'reject');
    const trimmedComment = comment.trim();
    if (needsComment && !trimmedComment) {
      setMessage(action === 'hold'
        ? 'Hold reason is required.'
        : action === 'return'
          ? 'Return remarks are required.'
          : 'Reason for changing an approved application is required.');
      return;
    }

    if ((action === 'approve' || (action === 'reject' && !isChangingApprovedDecision)) && !window.confirm(actionTitle(action))) {
      return;
    }

    setLoadingId(application.id);
    setMessage(null);

    try {
      const body: Record<string, string> = {
        id: application.id,
        status: actionStatus(action, returnTo),
        reviewComment: trimmedComment,
      };
      if (action === 'return') body.returnTo = returnTo;

      const response = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message ?? 'Unable to update application.');
      }

      setItems((current) => current.map((item) => (
        item.id === application.id
          ? { ...item, status: result.status ?? actionStatus(action, returnTo), updatedAt: result.updatedAt ? new Date(result.updatedAt) : new Date() }
          : item
      )));
      resetAction();
      setMessage('Application updated successfully.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update application.');
    } finally {
      setLoadingId(null);
    }
  };

  if (applications.length <= 1) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerClassName ?? 'inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100'}
      >
        <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
        {triggerLabel ?? `Same family: ${applications.length} orphans`}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="family-orphan-records-title"
            className="flex max-h-[94vh] w-full max-w-[1380px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
                  <Baby className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 id="family-orphan-records-title" className="text-lg font-bold leading-6 text-slate-950">Orphans From This Family</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Compare related orphan records and make the appropriate admin decision.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{items.length} orphan records</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Youngest highlighted</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close same family applications"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 overflow-auto bg-slate-50/70 p-3 sm:p-5">
              {message ? (
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900">
                  {message}
                </div>
              ) : null}

              <div className="hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
                <table className="w-full min-w-[1180px] table-fixed text-left text-sm text-slate-700">
                  <thead className="sticky top-0 z-10 bg-blue-600 text-xs uppercase text-white shadow-sm">
                    <tr>
                      <th className="w-[190px] px-4 py-4">Orphan</th>
                      <th className="w-[90px] px-3 py-4">Age</th>
                      <th className="w-[155px] px-3 py-4">Father CNIC</th>
                      <th className="w-[155px] px-3 py-4">Mother CNIC</th>
                      <th className="w-[175px] px-3 py-4">Guardian CNIC</th>
                      <th className="w-[150px] px-3 py-4">Status</th>
                      <th className="w-[245px] px-3 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((application) => {
                      const isCurrent = application.id === currentApplicationId;
                      const isYoungest = youngestKnownAge !== null && application.age === youngestKnownAge;
                      const canAct = canUseAdminFinalActions(application.status);
                      return (
                        <tr key={application.id} className={`border-b border-slate-100 last:border-b-0 ${isCurrent ? 'bg-blue-50' : isYoungest ? 'bg-emerald-50/40' : 'bg-white hover:bg-slate-50/80'}`}>
                          <td className={`border-l-4 px-3 py-4 align-top ${isCurrent ? 'border-l-blue-500' : isYoungest ? 'border-l-emerald-400' : 'border-l-transparent'}`}>
                            <p className="break-words font-semibold leading-5 text-slate-950 [overflow-wrap:anywhere]">{application.registrationNumber ?? application.id}</p>
                            <p className="mt-1 text-xs text-slate-600">{text(application.childName)}</p>
                            {isCurrent ? <span className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Current application</span> : null}
                          </td>
                          <td className="px-3 py-4 align-top">
                            <span className="font-semibold text-slate-900">{typeof application.age === 'number' ? `${application.age} years` : '-'}</span>
                            {isYoungest ? <span className="mt-2 block w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Youngest</span> : null}
                          </td>
                          <td className="px-3 py-4 align-top">
                            <p className="whitespace-nowrap tabular-nums text-slate-700">{cnic(application.fatherCnic)}</p>
                            <p className="mt-1 text-xs text-slate-500">{text(application.fatherName)}</p>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <p className="whitespace-nowrap tabular-nums text-slate-700">{cnic(application.motherCnic)}</p>
                            <p className="mt-1 text-xs text-slate-500">{text(application.motherName)}</p>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <p className="whitespace-nowrap tabular-nums text-slate-700">{guardianCnic(application)}</p>
                            <p className="mt-1 text-xs text-slate-500">{guardianName(application)}</p>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[application.status] ?? 'bg-slate-100 text-slate-700'}`}>
                              {applicationStatusLabel(application.status)}
                            </span>
                            <p className="mt-2 text-xs text-slate-500">Updated {formatDate(application.updatedAt)}</p>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="space-y-2">
                              <Link href={`${hrefPrefix}/${application.id}`} className={reviewLinkClass}>
                                Open review <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </Link>
                              {canAct ? (
                                <div className={`grid gap-2 ${actionGridClass(application.status)}`}>
                                  {application.status !== 'admin_approved' ? (
                                    <button type="button" onClick={() => submitAction(application, 'approve')} disabled={loadingId === application.id} className={`${modalActionButtonClass} bg-emerald-600 hover:bg-emerald-500`}>
                                      <Check className="h-3.5 w-3.5" /> Approve
                                    </button>
                                  ) : null}
                                  {application.status === 'reviewer_approved' || application.status === 'admin_approved' ? (
                                    <button type="button" onClick={() => beginAction(application.id, 'hold')} disabled={loadingId === application.id} className={`${modalActionButtonClass} bg-amber-600 hover:bg-amber-500`}>
                                      <PauseCircle className="h-3.5 w-3.5" /> Hold
                                    </button>
                                  ) : null}
                                  <button type="button" onClick={() => beginAction(application.id, 'return')} disabled={loadingId === application.id} className={`${modalActionButtonClass} bg-blue-600 hover:bg-blue-500`}>
                                    <RotateCcw className="h-3.5 w-3.5" /> Return
                                  </button>
                                  <button type="button" onClick={() => application.status === 'admin_approved' ? beginAction(application.id, 'reject') : submitAction(application, 'reject')} disabled={loadingId === application.id} className={`${modalActionButtonClass} bg-rose-600 hover:bg-rose-500`}>
                                    <X className="h-3.5 w-3.5" /> Reject
                                  </button>
                                </div>
                              ) : null}
                            </div>
                            {pending?.id === application.id ? (
                              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                                <p className="text-xs font-semibold text-slate-900">{actionTitle(pending.action, application.status === 'admin_approved')}</p>
                                {application.status === 'admin_approved' ? (
                                  <p className="mt-1 text-xs leading-5 text-amber-800">This changes an approved decision. Required remarks will be saved in activity history.</p>
                                ) : null}
                                {pending.action === 'return' ? (
                                  <select
                                    value={returnTo}
                                    onChange={(event) => setReturnTo(event.target.value as 'reviewer' | 'supervisor')}
                                    className="mt-2 min-h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  >
                                    <option value="reviewer">Return to reviewer</option>
                                    <option value="supervisor">Return to supervisor</option>
                                  </select>
                                ) : null}
                                <textarea
                                  value={comment}
                                  onChange={(event) => setComment(event.target.value)}
                                  rows={3}
                                  className="mt-2 w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  placeholder={pending.action === 'hold' ? 'Required hold reason' : pending.action === 'return' ? 'Required return remarks' : 'Required reason for changing approval'}
                                />
                                <div className="mt-2 flex gap-2">
                                  <button type="button" onClick={() => submitAction(application, pending.action)} disabled={loadingId === application.id || !comment.trim()} className="inline-flex min-h-8 flex-1 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                                    Confirm
                                  </button>
                                  <button type="button" onClick={resetAction} className="inline-flex min-h-8 flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {sortedItems.map((application) => (
                  <div key={application.id} className={`rounded-lg border bg-white p-3 shadow-sm ${application.id === currentApplicationId ? 'border-blue-300' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{application.registrationNumber ?? application.id}</p>
                        <p className="mt-1 text-sm text-slate-600">{text(application.childName)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusTone[application.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {applicationStatusLabel(application.status)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700">
                      <p><span className="font-semibold">Age:</span> {typeof application.age === 'number' ? `${application.age} years` : '-'}</p>
                      <p><span className="font-semibold">Father CNIC:</span> {cnic(application.fatherCnic)}</p>
                      <p><span className="font-semibold">Mother CNIC:</span> {cnic(application.motherCnic)}</p>
                      <p><span className="font-semibold">Guardian CNIC:</span> {guardianCnic(application)}</p>
                    </div>
                    <Link href={`${hrefPrefix}/${application.id}`} className={`${reviewLinkClass} mt-3 text-sm`}>
                      Open review <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    {canUseAdminFinalActions(application.status) ? (
                      <div className={`mt-3 grid gap-2 ${actionGridClass(application.status)}`}>
                        {application.status !== 'admin_approved' ? (
                          <button type="button" onClick={() => submitAction(application, 'approve')} disabled={loadingId === application.id} className={`${modalActionButtonClass} bg-emerald-600 hover:bg-emerald-500`}>
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                        ) : null}
                        {application.status === 'reviewer_approved' || application.status === 'admin_approved' ? (
                          <button type="button" onClick={() => beginAction(application.id, 'hold')} disabled={loadingId === application.id} className={`${modalActionButtonClass} bg-amber-600 hover:bg-amber-500`}>
                            <PauseCircle className="h-3.5 w-3.5" /> Hold
                          </button>
                        ) : null}
                        <button type="button" onClick={() => beginAction(application.id, 'return')} disabled={loadingId === application.id} className={`${modalActionButtonClass} bg-blue-600 hover:bg-blue-500`}>
                          <RotateCcw className="h-3.5 w-3.5" /> Return
                        </button>
                        <button type="button" onClick={() => application.status === 'admin_approved' ? beginAction(application.id, 'reject') : submitAction(application, 'reject')} disabled={loadingId === application.id} className={`${modalActionButtonClass} bg-rose-600 hover:bg-rose-500`}>
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    ) : null}
                    {pending?.id === application.id ? (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-semibold text-slate-900">{actionTitle(pending.action, application.status === 'admin_approved')}</p>
                        {application.status === 'admin_approved' ? (
                          <p className="mt-1 text-xs leading-5 text-amber-800">This changes an approved decision. Required remarks will be saved in activity history.</p>
                        ) : null}
                        {pending.action === 'return' ? (
                          <select
                            value={returnTo}
                            onChange={(event) => setReturnTo(event.target.value as 'reviewer' | 'supervisor')}
                            className="mt-2 min-h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="reviewer">Return to reviewer</option>
                            <option value="supervisor">Return to supervisor</option>
                          </select>
                        ) : null}
                        <textarea
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          rows={3}
                          className="mt-2 w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          placeholder={pending.action === 'hold' ? 'Required hold reason' : pending.action === 'return' ? 'Required return remarks' : 'Required reason for changing approval'}
                        />
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={() => submitAction(application, pending.action)} disabled={loadingId === application.id || !comment.trim()} className="inline-flex min-h-8 flex-1 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                            Confirm
                          </button>
                          <button type="button" onClick={resetAction} className="inline-flex min-h-8 flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
