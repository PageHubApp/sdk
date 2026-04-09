import { TabAtom } from "../Viewport/atoms";
import { AutoHideScrollbar } from "components/layout/AutoHideScrollbar";
import { Tooltip } from "components/layout/Tooltip";
import React, { useEffect, useRef, useState } from "react";
import { useSetAtomState } from "../../utils/atoms";

// Convert tab title to valid HTML ID
export const toSectionId = (title: string) => `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export const UnifiedTab = ({ icon, title, onClick, isActive }) => {
  const [showActiveColor, setShowActiveColor] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => setShowActiveColor(true), 160);
      return () => clearTimeout(t);
    } else {
      setShowActiveColor(false);
    }
  }, [isActive]);

  return (
    <Tooltip content={title} placement="top" arrow={false}>
      <div
        className={`relative flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-lg font-medium transition-colors ${showActiveColor
            ? "text-primary"
            : "text-secondary-content hover:text-base-content"
          }`}
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={onClick}
      >
        <span className="relative z-10">{icon}</span>
      </div>
    </Tooltip>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export const UnifiedSection = ({
  title,
  children,
  onVisibilityChange,
}: SectionProps & { onVisibilityChange?: (visible: boolean) => void }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const onVisibilityChangeRef = useRef(onVisibilityChange);
  onVisibilityChangeRef.current = onVisibilityChange;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Section is active if it's in the top portion of the viewport
        const rect = entry.boundingClientRect;
        const scrollContainer = document.getElementById("toolbarContents");

        if (!scrollContainer) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const topThreshold = containerRect.top + 60;

        // Section is active if it's visible and its top edge is near the container top
        // Also require the bottom edge is below the threshold so mostly-scrolled-away sections don't count
        const isActive = entry.isIntersecting && rect.top <= topThreshold && rect.bottom > topThreshold;

        setIsVisible(isActive);
        onVisibilityChangeRef.current?.(isActive);
      },
      {
        root: document.getElementById("toolbarContents"),
        threshold: [0, 0.1, 0.25, 0.5], // Check at multiple points
        rootMargin: "0px", // No margin, use direct calculation
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <div id={toSectionId(title)} ref={sectionRef} className="flex flex-col">
      {/* Section Content */}
      <div id={`${toSectionId(title)}-content`} className="flex flex-col">
        {children}
      </div>
    </div>
  );
};

interface UnifiedTabBodyProps {
  sections: Array<{
    title: string;
    children: React.ReactNode;
  }>;
  isInitialMount?: boolean;
}

// Timestamp of last click-driven tab change. Scroll-based updates
// are suppressed briefly after a click so they don't fight the indicator.
let clickLockUntil = 0;

/** Call from tab click handlers to immediately set the active tab
 *  and suppress scroll-based tracking for a brief window. */
export function setActiveTabFromClick(title: string, setTab: (t: string) => void) {
  setTab(title);
  clickLockUntil = Date.now() + 400;
}

export const UnifiedTabBody = ({ sections, isInitialMount = false }: UnifiedTabBodyProps) => {
  const [visibleSections, setVisibleSections] = React.useState<Set<string>>(new Set());
  const setActiveTab = useSetAtomState(TabAtom);
  const sectionTitlesRef = useRef<string[]>([]);

  // Store section titles in a ref to avoid dependency issues
  useEffect(() => {
    sectionTitlesRef.current = sections.map(s => s.title);
  }, [sections]);

  // Update TabAtom when visible section changes (but not during initial mount
  // and not during the click-lock window)
  useEffect(() => {
    if (visibleSections.size > 0 && !isInitialMount && Date.now() > clickLockUntil) {
      const firstVisible = sectionTitlesRef.current.find(title => visibleSections.has(title));
      if (firstVisible) {
        setActiveTab(firstVisible);
      }
    }
  }, [visibleSections, isInitialMount, setActiveTab]);

  const handleVisibilityChange = (title: string, visible: boolean) => {
    setVisibleSections(prev => {
      const newSet = new Set(prev);
      if (visible) {
        newSet.add(title);
      } else {
        newSet.delete(title);
      }
      return newSet;
    });
  };

  return (
    <AutoHideScrollbar
      id="toolbarContents"
      className="flex min-h-0 flex-1 flex-col overflow-x-hidden"
      hideDelay={2000}
    >
      {sections.map((section, index) => (
        <UnifiedSection
          key={section.title}
          title={section.title}
          onVisibilityChange={visible => handleVisibilityChange(section.title, visible)}
        >
          {section.children}
        </UnifiedSection>
      ))}
      {/* Spacer so the last section can scroll fully to the top */}
      <div className="shrink-0" style={{ minHeight: "70vh" }} />
    </AutoHideScrollbar>
  );
};

// Helper to scroll to section
export const scrollToSection = (title: string) => {
  const sectionId = toSectionId(title);
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "instant", block: "start" });
    const scrollContainer = section.closest(".overflow-y-auto");
    if (scrollContainer) {
      scrollContainer.scrollTop -= 7;
    }
  }
};
