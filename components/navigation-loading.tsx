'use client';

import { createContext, ReactNode, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import logo from '@/assests/logo.png';

type LoadingMode = 'default' | 'portal';

type NavigationLoadingContextValue = {
  startLoading: (mode?: LoadingMode) => void;
  stopLoading: () => void;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(null);

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldStartForLink(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return false;

  return true;
}

function NavigationLoadingInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<LoadingMode>('default');
  const [scopeNode, setScopeNode] = useState<HTMLElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
    setLoadingMode('default');
  }, []);

  const startLoading = useCallback((mode: LoadingMode = 'default') => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setLoadingMode(mode);
    setIsLoading(true);
    timeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
      setLoadingMode('default');
      timeoutRef.current = null;
    }, 15000);
  }, []);

  useEffect(() => {
    stopLoading();
  }, [pathname, searchParams, stopLoading]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]');
      if (anchor instanceof HTMLAnchorElement && shouldStartForLink(anchor)) {
        startLoading();
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [startLoading]);

  useEffect(() => {
    setScopeNode(document.querySelector<HTMLElement>('[data-navigation-loading-scope]'));
  }, [pathname, searchParams]);

  const value = useMemo(() => ({ startLoading, stopLoading }), [startLoading, stopLoading]);

  const scopedLoadingOverlay = scopeNode ? createPortal(
    <div className="pointer-events-none absolute inset-0 z-[100] flex items-center justify-center bg-white/72" role="status" aria-live="polite" aria-label="Loading">
      <div className="absolute left-0 top-0 h-1 w-full overflow-hidden bg-blue-100/90">
        <div className="h-full w-1/2 animate-[navigation-progress_1.1s_ease-in-out_infinite] bg-blue-600" />
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" aria-hidden="true" />
        Loading...
      </div>
    </div>,
    scopeNode,
  ) : null;

  return (
    <NavigationLoadingContext.Provider value={value}>
      {children}
      {isLoading && loadingMode === 'portal' ? (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-white" role="status" aria-live="polite" aria-label="Opening portal">
          <div className="flex flex-col items-center gap-5">
            <div className="relative flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
              <span className="absolute inset-0 animate-[portal-logo-halo_1.8s_ease-in-out_infinite] rounded-full bg-blue-50" aria-hidden="true" />
              <span className="absolute inset-4 animate-[portal-logo-halo_1.8s_ease-in-out_infinite_0.25s] rounded-full bg-emerald-50" aria-hidden="true" />
              <Image
                src={logo}
                alt="Saiban"
                priority
                className="relative h-28 w-auto animate-[portal-logo-float_1.9s_ease-in-out_infinite] object-contain drop-shadow-[0_18px_28px_rgba(15,23,42,0.14)] sm:h-36"
              />
            </div>
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full w-1/2 animate-[navigation-progress_1.1s_ease-in-out_infinite] rounded-full bg-blue-600" />
            </span>
          </div>
        </div>
      ) : isLoading ? (
        scopedLoadingOverlay
      ) : null}
    </NavigationLoadingContext.Provider>
  );
}

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <NavigationLoadingInner>{children}</NavigationLoadingInner>
    </Suspense>
  );
}

export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    return {
      startLoading: (_mode?: LoadingMode) => {},
      stopLoading: () => {},
    };
  }
  return context;
}

export function NavigationLoadingScope({ children }: { children: ReactNode }) {
  return (
    <div data-navigation-loading-scope className="relative min-h-full">
      {children}
    </div>
  );
}

