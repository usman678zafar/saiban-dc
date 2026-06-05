'use client';

import { HelpCircle, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';

const whatsappPhone = '923332552956';
const displayPhone = '0333 2552956';
const whatsappMessage = encodeURIComponent('Assalamualaikum, I need help with the Saiban volunteer portal.');
const whatsappHref = `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`;

interface HeaderHelpMenuProps {
  className?: string;
  popoverClassName?: string;
  iconOnly?: boolean;
}

export default function HeaderHelpMenu({ className, popoverClassName = 'top-[6.75rem] sm:top-20', iconOnly = false }: HeaderHelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="field-worker-help-menu"
        aria-label="Need help?"
        title="Need help?"
        onClick={() => setIsOpen((current) => !current)}
        className={`${iconOnly ? 'h-9 w-9 rounded-xl px-0 sm:h-12 sm:w-12 sm:rounded-2xl' : 'h-8 rounded-lg px-2.5 sm:h-10 sm:px-3.5'} group inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border border-emerald-500/20 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:text-sm`}
      >
        <span className={`${iconOnly ? 'h-6 w-6 sm:h-8 sm:w-8' : 'h-5 w-5'} flex items-center justify-center rounded-full bg-white/18 ring-1 ring-white/25 transition group-hover:bg-white/24`}>
          <HelpCircle className={iconOnly ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-3.5 w-3.5'} aria-hidden="true" />
        </span>
        {iconOnly ? <span className="sr-only">Need help?</span> : 'Need help?'}
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
            className={`fixed right-3 z-50 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-2xl shadow-slate-900/14 sm:right-6 ${popoverClassName}`}
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
