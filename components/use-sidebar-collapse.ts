'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(true);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelCollapse = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }, []);

  const expandSidebar = useCallback(() => {
    cancelCollapse();
    setCollapsed(false);
  }, [cancelCollapse]);

  const collapseSidebar = useCallback(() => {
    cancelCollapse();
    collapseTimer.current = setTimeout(() => {
      setCollapsed(true);
      collapseTimer.current = null;
    }, 140);
  }, [cancelCollapse]);

  useEffect(() => cancelCollapse, [cancelCollapse]);

  return {
    collapsed,
    expandSidebar,
    collapseSidebar,
  };
}
