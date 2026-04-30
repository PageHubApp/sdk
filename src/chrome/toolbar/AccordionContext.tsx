import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";
import { phStorage } from "../../utils/phStorage";

const DEFAULT_OPEN_SECTION = "Content";

const AccordionContext = createContext(null);

export const useAccordionContext = () => useContext(AccordionContext);

export const AccordionProvider = ({ children }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    return phStorage.getJSON("accordion-state", {}) as Record<string, boolean>;
  });

  /** Map<title, { defaultOpen, primary }>. Only `primary` sections are toggled by toggleAll. */
  const registeredSections = useRef(new Map<string, { defaultOpen: boolean; primary: boolean }>());

  const persist = state => {
    try {
      phStorage.set("accordion-state", state);
    } catch {}
  };

  const sectionDefault = useCallback(
    (title: string, hint?: boolean) =>
      hint ?? registeredSections.current.get(title)?.defaultOpen ?? title === DEFAULT_OPEN_SECTION,
    []
  );

  const getIsOpen = useCallback(
    (title, defaultOpenHint?: boolean) => {
      if (title in openSections) return openSections[title];
      return sectionDefault(title, defaultOpenHint);
    },
    [openSections, sectionDefault]
  );

  const toggle = useCallback(
    (title, defaultOpenHint?: boolean) => {
      setOpenSections(prev => {
        const currentlyOpen = title in prev ? prev[title] : sectionDefault(title, defaultOpenHint);
        const next = { ...prev, [title]: !currentlyOpen };
        persist(next);
        return next;
      });
    },
    [sectionDefault]
  );

  const setOpen = useCallback((title: string, value: boolean) => {
    setOpenSections(prev => {
      if (prev[title] === value) return prev;
      const next = { ...prev, [title]: value };
      persist(next);
      return next;
    });
  }, []);

  const register = useCallback((title, defaultOpen = false, primary = false) => {
    registeredSections.current.set(title, { defaultOpen: !!defaultOpen, primary: !!primary });
  }, []);

  const unregister = useCallback(title => {
    registeredSections.current.delete(title);
  }, []);

  const toggleAll = useCallback(() => {
    setOpenSections(prev => {
      const sections = registeredSections.current;
      let hasAnyOpen = false;
      sections.forEach((meta, title) => {
        if (!meta.primary) return;
        const isOpen = title in prev ? prev[title] : sectionDefault(title);
        if (isOpen) hasAnyOpen = true;
      });

      const next = { ...prev };
      sections.forEach((meta, title) => {
        if (!meta.primary) return;
        next[title] = !hasAnyOpen;
      });
      persist(next);
      return next;
    });
  }, [sectionDefault]);

  const openOnly = useCallback((titles: string[]) => {
    setOpenSections(() => {
      const toOpen = new Set(titles);
      const next: Record<string, boolean> = {};
      registeredSections.current.forEach((_meta, title) => {
        next[title] = toOpen.has(title);
      });
      persist(next);
      return next;
    });
  }, []);

  const openAll = useCallback(() => {
    setOpenSections(prev => {
      const next = { ...prev };
      registeredSections.current.forEach((_, title) => {
        next[title] = true;
      });
      // Don't persist search-triggered open state
      return next;
    });
  }, []);

  const anyOpen = useMemo(() => {
    const sections = registeredSections.current;
    let sawPrimary = false;
    for (const [title, meta] of sections) {
      if (!meta.primary) continue;
      sawPrimary = true;
      const isOpen = title in openSections ? openSections[title] : meta.defaultOpen;
      if (isOpen) return true;
    }
    if (sawPrimary) return false;
    // Fallback (no primary sections registered yet — first render)
    const hasExplicitlyOpen = Object.values(openSections).some(v => v === true);
    const contentDefaultOpen = !(DEFAULT_OPEN_SECTION in openSections);
    return hasExplicitlyOpen || contentDefaultOpen;
  }, [openSections]);

  return (
    <AccordionContext.Provider
      value={{
        getIsOpen,
        toggle,
        setOpen,
        toggleAll,
        openAll,
        openOnly,
        register,
        unregister,
        anyOpen,
      }}
    >
      {children}
    </AccordionContext.Provider>
  );
};
