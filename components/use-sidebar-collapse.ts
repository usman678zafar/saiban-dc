'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'saiban-sidebar-collapsed';

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY) === 'true';
    setCollapsed(storedValue);
    document.documentElement.dataset.sidebarCollapsed = String(storedValue);

    return () => {
      delete document.documentElement.dataset.sidebarCollapsed;
    };
  }, []);

  function updateCollapsed(value: boolean) {
    setCollapsed(value);
    document.documentElement.dataset.sidebarCollapsed = String(value);
    window.localStorage.setItem(STORAGE_KEY, String(value));
  }

  return { collapsed, setCollapsed: updateCollapsed };
}
