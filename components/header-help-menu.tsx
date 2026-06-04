'use client';

import { HelpCircle, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';

const whatsappPhone = '923332552956';
const displayPhone = '0333 2552956';
const whatsappMessage = encodeURIComponent('Assalamualaikum, I need help with the Saiban volunteer portal.');
const whatsappHref = `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`;

interface HeaderHelpMenuProps {
  className?: string;
}

export default function HeaderHelpMenu({ className }: HeaderHelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="field-worker-help-menu"
        onClick={() => setIsOpen((current) => !current)}
        className="group inline-flex min-h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:min-h-0 sm:w-auto sm:px-3.5 sm:py-2.5"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/25 transition group-hover:bg-white/24 sm:h-6 sm:w-6">
          <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
        </span>
        Need help?
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Close help menu"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
            tabIndex={-1}
          />
          <div
            id="field-worker-help-menu"
            role="dialog"
            aria-label="Volunteer portal help"
            className="fixed right-3 top-[8.5rem] z-50 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-2xl shadow-slate-900/14 sm:right-6 sm:top-20"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Contact us if you need help</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">Chat with support on WhatsApp for portal assistance.</p>
              </div>
              <button
                type="button"
                aria-label="Close help menu"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="group flex items-center gap-3 px-4 py-4 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/25 transition group-hover:scale-105">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-950">WhatsApp Support</span>
                <span className="block text-xs text-slate-500">{displayPhone}</span>
              </span>
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}
