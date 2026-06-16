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
      users: 'System Users',
      admins: 'System Admin',
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
  blue: { icon: ClipboardList, card: 'from-[#2563eb] to-[#1d4ed8]' },
  steel: { icon: FileText, card: 'from-[#64748b] to-[#475569]' },
  violet: { icon: Send, card: 'from-[#8b5cf6] to-[#6d28d9]' },
  indigo: { icon: ShieldCheck, card: 'from-[#6366f1] to-[#4338ca]' },
  emerald: { icon: CheckCircle2, card: 'from-[#22c55e] to-[#15803d]' },
  sky: { icon: UsersRound, card: 'from-[#0ea5e9] to-[#0369a1]' },
  red: { icon: FileCheck2, card: 'from-[#fb7185] to-[#e11d48]' },
  amber: { icon: RotateCcw, card: 'from-[#f59e0b] to-[#d97706]' },
  orange: { icon: UsersRound, card: 'from-[#fb923c] to-[#ea580c]' },
  charcoal: { icon: FileText, card: 'from-[#475569] to-[#1e293b]' },
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const style = metricStyles[metric.tone];
          const Icon = style.icon;

          return (
            <div key={metric.key} className={`min-h-[92px] overflow-hidden rounded-xl bg-gradient-to-br px-4 py-3 text-white shadow-[0_16px_34px_rgba(15,31,51,0.14)] ${style.card}`}>
              <div className={`flex h-full items-center gap-3 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/18 text-white ring-1 ring-white/20">
                  <Icon size={19} strokeWidth={2.1} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold leading-5 text-white/82" dir={dir}>{t.metrics[metric.key]}</p>
                  <p className="mt-1 truncate text-2xl font-bold leading-none text-white">
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
