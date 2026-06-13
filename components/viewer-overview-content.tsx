'use client';

import { CheckCircle2, ClipboardList, FileCheck2, FileText, RotateCcw, Send, ShieldCheck, UsersRound } from 'lucide-react';
import ViewerGeoStoryMap, { type ViewerGeoApplication } from './viewer-geo-story-map';
import { useViewerLanguage } from './viewer-language';

export type ViewerMetricKey =
  | 'totalApplications'
  | 'drafts'
  | 'submitted'
  | 'needsCorrection'
  | 'supervisorApproved'
  | 'reviewerApproved'
  | 'finalApproved'
  | 'rejected'
  | 'users'
  | 'admins';

export type ViewerMetric = {
  key: ViewerMetricKey;
  value: number;
  tone: 'blue' | 'steel' | 'violet' | 'indigo' | 'emerald' | 'sky' | 'red' | 'amber' | 'orange' | 'charcoal';
};

const copy = {
  en: {
    title: 'Viewer Overview',
    subtitle: 'Read-only application totals and recent records across every department.',
    metrics: {
      totalApplications: 'Total Applications',
      drafts: 'Drafts',
      submitted: 'Submitted',
      needsCorrection: 'Needs Correction',
      supervisorApproved: 'Supervisor Approved',
      reviewerApproved: 'Reviewer Approved',
      finalApproved: 'Final Approved',
      rejected: 'Rejected',
      users: 'Users',
      admins: 'Admins',
    },
  },
  ur: {
    title: 'ناظر جائزہ',
    subtitle: 'ہر شعبے کی درخواستوں، حیثیتوں، اور جغرافیائی رسائی کا صرف دیکھنے والا خلاصہ۔',
    metrics: {
      totalApplications: 'کل درخواستیں',
      drafts: 'مسودے',
      submitted: 'جمع شدہ',
      needsCorrection: 'اصلاح درکار',
      supervisorApproved: 'سپروائزر منظور شدہ',
      reviewerApproved: 'ریویوور منظور شدہ',
      finalApproved: 'حتمی منظور شدہ',
      rejected: 'مسترد',
      users: 'صارفین',
      admins: 'ایڈمنز',
    },
  },
};

const metricStyles = {
  blue: { icon: ClipboardList, card: 'bg-[#2563eb]' },
  steel: { icon: FileText, card: 'bg-[#64748b]' },
  violet: { icon: Send, card: 'bg-[#8b5cf6]' },
  indigo: { icon: ShieldCheck, card: 'bg-[#6366f1]' },
  emerald: { icon: CheckCircle2, card: 'bg-[#54cc59]' },
  sky: { icon: UsersRound, card: 'bg-[#20b8d8]' },
  red: { icon: FileCheck2, card: 'bg-[#ff5f6d]' },
  amber: { icon: RotateCcw, card: 'bg-[#f59e0b]' },
  orange: { icon: UsersRound, card: 'bg-[#ffad47]' },
  charcoal: { icon: FileText, card: 'bg-[#475569]' },
};

export default function ViewerOverviewContent({
  metrics,
  geoApplications,
}: {
  metrics: ViewerMetric[];
  geoApplications: ViewerGeoApplication[];
}) {
  const { language } = useViewerLanguage();
  const t = copy[language];
  const isRtl = language === 'ur';
  const dir = isRtl ? 'rtl' : 'ltr';

  return (
    <>
      <header className={`mb-4 flex w-full flex-col gap-3 ${isRtl ? 'items-end text-right' : 'items-start text-left'}`}>
        <div className="w-full">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl" dir={dir}>{t.title}</h1>
          <p className={`mt-1 max-w-3xl text-xs leading-5 text-[#5f718a] sm:text-sm ${isRtl ? 'ml-auto' : ''}`} dir={dir}>{t.subtitle}</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const style = metricStyles[metric.tone];
          const Icon = style.icon;

          return (
            <div key={metric.key} className={`min-h-[132px] rounded-lg px-5 py-7 text-white shadow-[0_18px_32px_rgba(15,31,51,0.10)] 2xl:px-8 ${style.card}`}>
              <div className={`flex h-full items-center gap-5 2xl:gap-8 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <div className="flex size-16 shrink-0 items-center justify-center text-white/95">
                  <Icon size={52} strokeWidth={1.9} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xl font-medium leading-6 text-white" dir={dir}>{t.metrics[metric.key]}</p>
                  <p className="mt-2 truncate text-3xl font-semibold leading-none text-white">
                    {metric.value.toLocaleString(language === 'ur' ? 'ur-PK' : 'en-US')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <ViewerGeoStoryMap points={geoApplications} />
    </>
  );
}
