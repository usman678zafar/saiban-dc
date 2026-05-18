'use client';

import { createContext, ReactNode, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type NavigationLoadingContextValue = {
  startLoading: () => void;
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
  const timeoutRef = useRef<number | null>(null);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const startLoading = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIsLoading(true);
    timeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
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

  const value = useMemo(() => ({ startLoading, stopLoading }), [startLoading, stopLoading]);

  return (
    <NavigationLoadingContext.Provider value={value}>
      {children}
      {isLoading ? (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/15 backdrop-blur-[1px]" role="status" aria-live="polite" aria-label="Loading">
          <div className="absolute left-0 top-0 h-1 w-full overflow-hidden bg-blue-100">
            <div className="h-full w-1/2 animate-[navigation-progress_1.1s_ease-in-out_infinite] bg-blue-600" />
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" aria-hidden="true" />
            Loading...
          </div>
        </div>
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
      startLoading: () => {},
      stopLoading: () => {},
    };
  }
  return context;
}
