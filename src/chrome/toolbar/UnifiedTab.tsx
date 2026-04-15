import { TabAtom } from "../viewport/atoms";
import { AutoHideScrollbar } from "@/chrome/primitives/layout/AutoHideScrollbar";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import React, { useEffect, useRef, useState } from "react";
import { useSetAtomState } from "../../utils/atoms";

// Convert tab title to valid HTML ID
export const toSectionId = (title: string) =>
  `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

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
    <div
      className={`relative flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-lg font-medium transition-[color,transform] active:scale-90 ${
        showActiveColor ? "text-primary" : "text-secondary-content hover:text-base-content"
      }`}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={title}
      data-tooltip-place="top"
      data-tooltip-offset={10}
    >
      <span className="relative z-10">{icon}</span>
    </div>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
  /** Stable 0–4 index for the unified settings stack — must not duplicate `title` (display names can match tab names). */
  stackIndex: number;
}

export const UnifiedSection = ({
  title,
  children,
  stackIndex,
  onVisibilityChange,
}: SectionProps & { onVisibilityChange?: (visible: boolean) => void }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const onVisibilityChangeRef = useRef(onVisibilityChange);
  onVisibilityChangeRef.current = onVisibilityChange;

  const sectionDomId = toSectionId(`stack-${stackIndex}`);

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
        const isActive =
          entry.isIntersecting && rect.top <= topThreshold && rect.bottom > topThreshold;

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
    <div
      id={sectionDomId}
      ref={sectionRef}
      className="flex flex-col"
      data-unified-stack-index={stackIndex}
    >
      {/* Section Content */}
      <div id={`${sectionDomId}-content`} className="flex flex-col">
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
  const [visibleSections, setVisibleSections] = React.useState<Set<number>>(new Set());
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
      const titles = sectionTitlesRef.current;
      for (let i = 0; i < titles.length; i++) {
        if (visibleSections.has(i)) {
          setActiveTab(titles[i]);
          break;
        }
      }
    }
  }, [visibleSections, isInitialMount, setActiveTab]);

  const handleVisibilityChange = (stackIndex: number, visible: boolean) => {
    setVisibleSections(prev => {
      const newSet = new Set(prev);
      if (visible) {
        newSet.add(stackIndex);
      } else {
        newSet.delete(stackIndex);
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
          key={index}
          stackIndex={index}
          title={section.title}
          onVisibilityChange={visible => handleVisibilityChange(index, visible)}
        >
          {section.children}
        </UnifiedSection>
      ))}
      {/* Spacer so the last section can scroll fully to the top */}
      <div className="shrink-0" style={{ minHeight: "70vh" }} />
    </AutoHideScrollbar>
  );
};

/** Tab labels that map to stack indices 1–4 when no explicit `stackIndex` is passed (first tab is 0). */
const UNIFIED_FIXED_TAB_TITLES = ["Layout", "Design", "Interactions", "Advanced"] as const;

/**
 * Scroll to a unified settings tab panel. Prefer `stackIndex` from the tab bar (0–4) when the
 * selected node’s display name matches a built-in tab title (e.g. "Layout", "Interactions").
 */
export const scrollToSection = (title: string, stackIndex?: number) => {
  let idx = stackIndex;
  if (idx === undefined) {
    const fixedIdx = (UNIFIED_FIXED_TAB_TITLES as readonly string[]).indexOf(title);
    idx = fixedIdx >= 0 ? fixedIdx + 1 : 0;
  }
  const sectionId = toSectionId(`stack-${idx}`);
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "instant", block: "start" });
    const scrollContainer = section.closest(".overflow-y-auto");
    if (scrollContainer) {
      scrollContainer.scrollTop -= 7;
    }
  }
};
