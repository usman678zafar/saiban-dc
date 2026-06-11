import { formatCnic } from '@/lib/contact-format';

type FieldWorkerDetailsUser = {
  name: string | null;
  fieldWorkerId: string | null;
  phoneNumber: string | null;
  cnic: string | null;
  project: string | null;
  selfRegistered: boolean;
} | null;

type FieldWorkerDetailsApplication = {
  collectorId: string | null;
  collectorName: string | null;
  collectorProject: string | null;
  collectorCnic: string | null;
  collectorAddress: string | null;
  collectorContact: string | null;
  createdAt: Date;
};

interface ApplicationFieldWorkerDetailsProps {
  application: FieldWorkerDetailsApplication;
  createdBy: FieldWorkerDetailsUser;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function value(value: string | null | undefined) {
  const text = value?.trim();
  return text || '-';
}

function cnic(value: string | null | undefined) {
  const text = value?.trim();
  return text ? formatCnic(text) : '-';
}

function row(label: string, content: string) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900 [overflow-wrap:anywhere]">{content}</dd>
    </div>
  );
}

export default function ApplicationFieldWorkerDetails({ application, createdBy }: ApplicationFieldWorkerDetailsProps) {
  const source = createdBy?.selfRegistered ? 'Self registered' : 'Field worker';
  const name = value(application.collectorName ?? createdBy?.name);
  const workerId = value(application.collectorId ?? createdBy?.fieldWorkerId);
  const department = value(application.collectorProject ?? createdBy?.project);
  const contact = value(application.collectorContact ?? createdBy?.phoneNumber);
  const workerCnic = cnic(application.collectorCnic ?? createdBy?.cnic);

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold leading-6 text-slate-900">Filled By</h2>
        <p className="text-xs leading-5 text-slate-500">{source} details captured with this application.</p>
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {row('Name', name)}
        {row('Worker ID', workerId)}
        {row('Department', department)}
        {row('Contact', contact)}
        {row('CNIC', workerCnic)}
        {row('Created', dateTimeFormatter.format(new Date(application.createdAt)))}
      </dl>

      {application.collectorAddress ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</p>
          <p className="mt-1 break-words text-sm leading-5 text-slate-700 [overflow-wrap:anywhere]">{application.collectorAddress}</p>
        </div>
      ) : null}
    </section>
  );
}
