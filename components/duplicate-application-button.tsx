'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CopyPlus } from 'lucide-react';

const urduFont = 'var(--urdu-font-family)';

const duplicatedFields = [
  'والد، والدہ اور سرپرست کی معلومات',
  'رشتہ داروں کی معلومات',
  'گھر، پتہ، GPS اور رہائش کی معلومات',
  'گھریلو اثاثہ جات',
  'گھریلو آمدنی اور بیرونی امداد کی معلومات',
  'بہن بھائیوں کی فہرست',
];

const clearedFields = [
  'نئے بچے کا نام، ب فارم، تاریخ پیدائش، عمر اور ذاتی معلومات',
  'صحت، تعلیم، مہارت اور بچے سے متعلق آمدنی کی معلومات',
  'تمام اپ لوڈ شدہ دستاویزات',
  'تصدیقی فارم، دستخط/انگوٹھا اور شرائط کی منظوری',
];

interface DuplicateApplicationButtonProps {
  applicationId: string;
  className: string;
  iconClassName?: string;
}

export default function DuplicateApplicationButton({ applicationId, className, iconClassName = 'h-4 w-4' }: DuplicateApplicationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const duplicateHref = `/applications/${applicationId}/duplicate`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Add orphan from same family"
        title="Add orphan from same family"
        className={className}
      >
        <CopyPlus className={iconClassName} />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div
            dir="rtl"
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-lg border border-blue-100 bg-white shadow-2xl"
            style={{ fontFamily: urduFont }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-application-title"
          >
            <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold text-blue-700">اسی خاندان سے نیا بچہ شامل کریں</p>
              <h2 id="duplicate-application-title" className="mt-0.5 text-base font-bold leading-6 text-slate-950">
                ڈپلیکیٹ کرتے وقت کون سی معلومات کاپی ہوں گی؟
              </h2>
            </div>
            <div className="space-y-3 px-4 py-3 text-right">
              <section>
                <h3 className="text-sm font-bold text-slate-950">یہ معلومات نئے ڈرافٹ میں کاپی ہوں گی:</h3>
                <ul className="mt-1.5 space-y-1 text-sm leading-6 text-slate-800">
                  {duplicatedFields.map((field) => (
                    <li key={field} className="grid grid-cols-[auto_1fr] gap-1.5">
                      <span className="text-blue-700">•</span>
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <h3 className="text-sm font-bold text-amber-950">یہ معلومات دوبارہ نئے بچے کے لیے درج کرنی ہوں گی:</h3>
                <ul className="mt-1.5 space-y-1 text-sm leading-6 text-amber-950">
                  {clearedFields.map((field) => (
                    <li key={field} className="grid grid-cols-[auto_1fr] gap-1.5">
                      <span>•</span>
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm leading-6 text-slate-700">
                نئی درخواست ہمیشہ ڈرافٹ کے طور پر بنے گی، تاکہ آپ نئے بچے کی معلومات مکمل کر کے بعد میں جمع کر سکیں۔
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:justify-start">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                واپس جائیں
              </button>
              <Link
                href={duplicateHref}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-600 sm:w-auto"
              >
                ڈپلیکیٹ جاری رکھیں
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
