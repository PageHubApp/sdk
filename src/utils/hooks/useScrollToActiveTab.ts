import React, { useEffect } from "react";

export const useScrollToActiveTab = (
  activeTab: string,
  setActiveSection: any,
  nodeId: string | null = null
) => {
  const [isInitialMount, setIsInitialMount] = React.useState(true);
  const hasScrolledRef = React.useRef(false);

  useEffect(
    () => {
      // Only scroll on true first mount — not on node switches.
      if (hasScrolledRef.current) return;

      setIsInitialMount(true);
      if (activeTab) {
        const timer = setTimeout(async () => {
          try {
            const { scrollToSection } = await import("../../chrome/toolbar/InspectorTab");
            scrollToSection(activeTab);
          } catch (_) {}
          hasScrolledRef.current = true;
          setActiveSection((prev: string) => (prev !== activeTab ? activeTab : prev));
          setTimeout(() => setIsInitialMount(false), 200);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        hasScrolledRef.current = true;
        setTimeout(() => setIsInitialMount(false), 300);
      }
    },
    nodeId !== null ? [nodeId] : []
  );

  return isInitialMount;
};
