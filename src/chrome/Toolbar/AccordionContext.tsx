import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";

const STORAGE_KEY = "ph-accordion-state";
const DEFAULT_OPEN_SECTION = "Content";

const AccordionContext = createContext(null);

export const useAccordionContext = () => useContext(AccordionContext);

export const AccordionProvider = ({ children }) => {
  const [openSections, setOpenSections] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const registeredSections = useRef(new Set());

  const persist = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  };

  const getIsOpen = useCallback(
    (title) => {
      if (title in openSections) return openSections[title];
      return title === DEFAULT_OPEN_SECTION;
    },
    [openSections]
  );

  const toggle = useCallback((title) => {
    setOpenSections((prev) => {
      const currentlyOpen = title in prev ? prev[title] : title === DEFAULT_OPEN_SECTION;
      const next = { ...prev, [title]: !currentlyOpen };
      persist(next);
      return next;
    });
  }, []);

  const register = useCallback((title) => {
    registeredSections.current.add(title);
  }, []);

  const unregister = useCallback((title) => {
    registeredSections.current.delete(title);
  }, []);

  const toggleAll = useCallback(() => {
    setOpenSections((prev) => {
      const sections = registeredSections.current;
      let hasAnyOpen = false;
      sections.forEach((title) => {
        const isOpen = title in prev ? prev[title] : title === DEFAULT_OPEN_SECTION;
        if (isOpen) hasAnyOpen = true;
      });

      const next = {};
      sections.forEach((title) => {
        next[title] = !hasAnyOpen;
      });
      persist(next);
      return next;
    });
  }, []);

  const openOnly = useCallback((titles: string[]) => {
    setOpenSections(() => {
      const toOpen = new Set(titles);
      const next = {};
      registeredSections.current.forEach((title) => {
        next[title] = toOpen.has(title);
      });
      persist(next);
      return next;
    });
  }, []);

  const anyOpen = useMemo(() => {
    const hasExplicitlyOpen = Object.values(openSections).some((v) => v === true);
    const contentDefaultOpen = !(DEFAULT_OPEN_SECTION in openSections);
    return hasExplicitlyOpen || contentDefaultOpen;
  }, [openSections]);

  return (
    <AccordionContext.Provider value={{ getIsOpen, toggle, toggleAll, openOnly, register, unregister, anyOpen }}>
      {children}
    </AccordionContext.Provider>
  );
};
