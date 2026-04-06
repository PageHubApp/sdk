import { useCallback, useEffect, useId, useRef, useState } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

/**
 * Traps focus within a container while open.
 * Restores focus to the previously focused element on close.
 */
export function useFocusTrap(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !ref.current) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    const container = ref.current;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null
      );

    // Focus first focusable element
    const initial = getFocusable();
    if (initial.length > 0) {
      // Defer to allow dialog to render
      requestAnimationFrame(() => initial[0]?.focus());
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  return ref;
}

type ArrowOrientation = "horizontal" | "vertical" | "both";

interface ArrowNavigationOptions {
  orientation?: ArrowOrientation;
  loop?: boolean;
  itemSelector?: string;
}

/**
 * Provides arrow key navigation within a container using roving tabindex.
 * Items matching `itemSelector` get tabIndex managed automatically.
 */
export function useArrowNavigation(options: ArrowNavigationOptions = {}) {
  const { orientation = "horizontal", loop = true, itemSelector = '[role="tab"], [role="menuitem"], [role="treeitem"], [role="option"]' } = options;
  const ref = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getItems = useCallback(() => {
    if (!ref.current) return [];
    return Array.from(ref.current.querySelectorAll<HTMLElement>(itemSelector)).filter(
      el => el.offsetParent !== null && !el.hasAttribute("disabled")
    );
  }, [itemSelector]);

  useEffect(() => {
    if (!ref.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) return;

      const currentIdx = items.indexOf(document.activeElement as HTMLElement);
      if (currentIdx === -1) return;

      let nextIdx = currentIdx;
      const isForward =
        (orientation !== "vertical" && e.key === "ArrowRight") ||
        (orientation !== "horizontal" && e.key === "ArrowDown");
      const isBackward =
        (orientation !== "vertical" && e.key === "ArrowLeft") ||
        (orientation !== "horizontal" && e.key === "ArrowUp");

      if (isForward) {
        e.preventDefault();
        nextIdx = loop ? (currentIdx + 1) % items.length : Math.min(currentIdx + 1, items.length - 1);
      } else if (isBackward) {
        e.preventDefault();
        nextIdx = loop ? (currentIdx === 0 ? items.length - 1 : currentIdx - 1) : Math.max(currentIdx - 1, 0);
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIdx = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIdx = items.length - 1;
      } else {
        return;
      }

      if (nextIdx !== currentIdx) {
        items[nextIdx].focus();
        setActiveIndex(nextIdx);
      }
    };

    const container = ref.current;
    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [getItems, orientation, loop]);

  // Update roving tabindex when activeIndex changes
  useEffect(() => {
    const items = getItems();
    items.forEach((item, i) => {
      item.setAttribute("tabindex", i === activeIndex ? "0" : "-1");
    });
  }, [activeIndex, getItems]);

  return { ref, activeIndex, setActiveIndex };
}

let announceRegion: HTMLDivElement | null = null;

function getAnnounceRegion(): HTMLDivElement {
  if (announceRegion && document.body.contains(announceRegion)) return announceRegion;
  announceRegion = document.createElement("div");
  announceRegion.setAttribute("aria-live", "polite");
  announceRegion.setAttribute("aria-atomic", "true");
  announceRegion.setAttribute("role", "status");
  announceRegion.className = "sr-only";
  announceRegion.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  document.body.appendChild(announceRegion);
  return announceRegion;
}

/**
 * Returns an `announce` function for screen reader announcements.
 * Uses a persistent aria-live region.
 */
export function useAnnounce() {
  const announce = useCallback((text: string, priority: "polite" | "assertive" = "polite") => {
    const region = getAnnounceRegion();
    region.setAttribute("aria-live", priority);
    // Clear then set to ensure re-announcement of identical text
    region.textContent = "";
    requestAnimationFrame(() => {
      region.textContent = text;
    });
  }, []);

  return announce;
}

/**
 * Returns props for accessible accordion trigger + panel pairing.
 * Provides aria-expanded, aria-controls, id, and role attributes.
 */
export function useAccordionA11y(isOpen: boolean, id?: string) {
  const generatedId = useId();
  const baseId = id || generatedId;
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  const triggerProps = {
    "aria-expanded": isOpen,
    "aria-controls": panelId,
    id: triggerId,
  };

  const panelProps = {
    id: panelId,
    role: "region" as const,
    "aria-labelledby": triggerId,
  };

  return { triggerProps, panelProps };
}
