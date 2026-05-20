import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CopyPlus } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { labels } from '@/lib/labels';
import AppShell from '@/components/app-shell';
import ApplicationStatusActions from '@/components/application-status-actions';
import ApplicationMigrationFields from '@/components/application-migration-fields';
import { assetUsesGrams, householdAssetDisplayLabel, type HouseholdAssetKey } from '@/lib/household-assets';
import { getApplicationDocuments } from '@/lib/application-documents';

interface ApplicationDetailPageProps {
  params: {
    id: string;
  };
}

type FieldKey = keyof typeof labels;

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

function labelFor(field: string) {
  return labels[field]?.en ?? field.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toLocaleString();
  return String(value);
}

function fieldItems(application: Record<string, unknown>, fields: string[]) {
  return fields.map((field) => ({
    label: labelFor(field),
    value: formatValue(application[field]),
  }));
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) notFound();

  const application = await prisma.orphanApplication.findUnique({
    where: { id: params.id },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
    },
  });

  if (!application) notFound();

  const isAdmin = session.user.role === 'admin';
  if (!isAdmin && application.createdById !== session.user.id) notFound();

  const app = application as unknown as Record<string, unknown>;
  const applicationDocuments = await getApplicationDocuments(application.id);
  const canEdit = application.status === 'draft' || application.status === 'needs_correction' || isAdmin;
  const sections = [
    {
      title: 'Collector',
      fields: ['collectorId', 'collectorName', 'collectorProject', 'collectorCnic', 'collectorAddress', 'collectorContact'],
    },
    {
      title: 'Father',
      fields: ['fatherName', 'fatherDob', 'fatherAge', 'fatherCnic', 'fatherEducation', 'fatherTongue', 'fatherNativeArea', 'fatherOccupation', 'fatherDateOfDeath', 'fatherCauseOfDeath'],
    },
    {
      title: 'Mother',
      fields: ['motherName', 'motherDob', 'motherAge', 'motherCnic', 'motherEducation', 'motherTongue', 'motherNativeArea', 'motherAlive', 'motherSeparationReason', 'motherContact', 'motherOccupation', 'motherMonthlyIncome', 'motherRemarried', 'motherDeathDate', 'motherDeathCause'],
    },
    {
      title: 'Guardian',
      fields: ['motherIsGuardian', 'guardianName', 'guardianRelationship', 'guardianGender', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue', 'guardianNativeArea', 'guardianContact', 'guardianOccupation', 'guardianFamilyHolder', 'guardianFamilyMembersCount', 'guardianMonthlyIncome'],
    },
    {
      title: 'Address and GPS',
      fields: ['province', 'district', 'tehsil', 'city', 'residentialArea', 'fullAddress', 'latitude', 'longitude', 'gpsAccuracyMeters', 'gpsCapturedAt'],
    },
    {
      title: 'Home',
      fields: ['houseOwnershipStatus', 'monthlyRent', 'rentPaidBy', 'houseCondition', 'residenceStructureType', 'residenceCategory', 'houseConditionRemarks', 'electricityAvailable', 'gasAvailable', 'waterAvailable', 'furnishingCondition', 'furnishingConditionRemarks'],
    },
    {
      title: 'Child',
      fields: ['childName', 'gender', 'religion', 'specifyReligion', 'syedStatus', 'nationality', 'specifyNationality', 'bFormNumber', 'dateOfBirth', 'age', 'totalSiblings', 'totalBrothers', 'totalSisters', 'registeredBrothers', 'registeredSisters', 'siblingsUnder12'],
    },
    {
      title: 'Health',
      fields: ['healthStatus', 'disabilityType', 'disabilityCause', 'disabilityCauseDetails', 'disabilitySince', 'treatmentOngoing', 'chronicDisease', 'specifyDisease', 'illnessSince', 'treatmentPlace', 'monthlyMedicalExpenses'],
    },
    {
      title: 'Education and Skills',
      fields: ['currentlyStudying', 'currentClass', 'schoolName', 'schoolAddress', 'schoolDistanceKm', 'schoolTransportMode', 'schoolStudyingSince', 'enrolledInMadrasa', 'madrasaName', 'madrasaEducationDetails', 'educationStartCondition', 'educationUndertakingAccepted', 'educationFree', 'monthlySchoolFee', 'currentSkillLearning', 'currentSkill', 'childHobbies', 'technicalSkillInterest', 'technicalSkill'],
    },
    {
      title: 'Income and Assistance',
      fields: ['totalFamilyMembers', 'householdHasMonthlyIncome', 'householdEarnersCount', 'totalHouseholdIncome', 'childEarnsIncome', 'childWorkNature', 'childMonthlyIncome', 'receivingOtherAid', 'otherAidSource', 'monthlyAidAmount', 'assistanceApplied', 'assistanceAppliedWhere'],
    },
  ];

  return (
    <AppShell
      title="Application Details"
      description="View draft or submitted application details, uploaded documents, and related records."
      maxWidth="max-w-7xl"
      actions={
        <>
          <Link href="/applications" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto">
            Back to List
          </Link>
          <Link href={`/applications/${application.id}/duplicate`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 sm:w-auto">
            <CopyPlus className="h-4 w-4" aria-hidden="true" />
            Add Child From Same Family
          </Link>
          {canEdit ? (
            <Link href={`/applications/${application.id}/edit`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 sm:w-auto">
              {application.status === 'draft' ? 'Edit Draft' : application.status === 'needs_correction' ? 'Correct Application' : 'Edit'}
            </Link>
          ) : null}
        </>
      }
    >
      <div className={`grid min-w-0 gap-5 ${isAdmin ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
        <div className="min-w-0 space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryTile label="Registration" value={application.registrationNumber ?? application.id} />
              <StatusTile label="Status" value={application.status} />
              <StatusTile label="Migration" value={application.migrationStatus} />
              <SummaryTile label="Updated" value={application.updatedAt.toLocaleString()} />
            </div>
          </section>

          {sections.map((section) => (
            <DetailSection key={section.title} title={section.title} items={fieldItems(app, section.fields)} />
          ))}

          <SiblingSection siblings={application.siblings} />
          <RelativeSection relatives={application.relatives} />
          <AssetSection assets={application.householdAssets} />
          <DocumentSection documents={applicationDocuments} />
        </div>

        {isAdmin ? (
          <aside className="min-w-0 space-y-5">
            <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} actorRole="admin" />
            <ApplicationMigrationFields
              applicationId={application.id}
              initialMigrationStatus={application.migrationStatus}
              initialMainSaibanId={application.mainSaibanId ?? ''}
              initialMigrationErrors={application.migrationErrors ?? ''}
            />
          </aside>
        ) : null}
      </div>
    </AppShell>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${badgeClass(value)}`}>
        {value}
      </span>
    </div>
  );
}

function DetailSection({ title, items }: { title: string; items: Array<{ label: string; value: string }> }) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <h2 className="text-lg font-semibold leading-7 text-slate-900">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <SummaryTile key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </section>
  );
}

function SiblingSection({ siblings }: { siblings: any[] }) {
  return (
    <TableSection
      title="Siblings"
      emptyText="No sibling records."
      headers={['Name', 'Relation', 'DOB', 'Age', 'Education', 'Studying', 'Occupation', 'Income/Fee', 'Marital']}
      rows={siblings.map((sibling) => [
        formatValue(sibling.name),
        formatValue(sibling.relation),
        formatValue(sibling.dob),
        formatValue(sibling.age),
        formatValue(sibling.educationStatus),
        formatValue(sibling.currentlyStudying),
        formatValue(sibling.occupation),
        formatValue(sibling.monthlyIncomeOrFee),
        formatValue(sibling.maritalStatus),
      ])}
    />
  );
}

function RelativeSection({ relatives }: { relatives: any[] }) {
  return (
    <TableSection
      title="Relatives"
      emptyText="No relative records."
      headers={['Relationship', 'Name', 'Age', 'Occupation', 'Monthly Income', 'Support']}
      rows={relatives.map((relative) => [
        formatValue(relative.relativeType),
        formatValue(relative.name),
        formatValue(relative.age),
        formatValue(relative.occupationOther || relative.occupation),
        formatValue(relative.monthlyIncome),
        formatValue(relative.supportTypeOther || relative.supportType),
      ])}
    />
  );
}

function AssetSection({ assets }: { assets: any[] }) {
  return (
    <TableSection
      title="Household Assets"
      emptyText="No household assets."
      headers={['Asset', 'Quantity', 'Value']}
      rows={assets.map((asset) => {
        const key = asset.assetType as HouseholdAssetKey;
        return [
          householdAssetDisplayLabel(key) ?? formatValue(asset.assetType),
          assetUsesGrams(key) ? `${formatValue(asset.quantity)} grams` : '-',
          formatValue(asset.value),
        ];
      })}
    />
  );
}

function DocumentSection({ documents }: { documents: any[] }) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <h2 className="text-lg font-semibold leading-7 text-slate-900">Documents</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No uploaded documents.</p>
        ) : (
          documents.map((document) => (
            <a key={document.id} href={document.fileUrl ?? '#'} target="_blank" rel="noreferrer" className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm hover:bg-slate-100">
              <p className="break-words font-semibold capitalize text-slate-900 [overflow-wrap:anywhere]">{String(document.documentType).replace(/_/g, ' ')}</p>
              <p className="mt-1 break-words text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">{document.mimeType} - {(document.size / 1024).toFixed(1)} KB</p>
            </a>
          ))
        )}
      </div>
    </section>
  );
}

function TableSection({ title, emptyText, headers, rows }: { title: string; emptyText: string; headers: string[]; rows: string[][] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-3 py-3 sm:px-4">
        <h2 className="text-lg font-semibold leading-7 text-slate-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <>
          <div className="grid gap-3 p-3 md:hidden">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title.slice(0, -1)} {rowIndex + 1}</p>
                <dl className="grid gap-3">
                  {row.map((cell, cellIndex) => (
                    <div key={`${rowIndex}-${cellIndex}`} className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{headers[cellIndex]}</dt>
                      <dd className="mt-1 break-words text-sm font-medium leading-6 text-slate-900 [overflow-wrap:anywhere]">{cell}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50">
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="max-w-[280px] break-words px-3 py-2 align-top text-slate-700 [overflow-wrap:anywhere]">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </section>
  );
}
