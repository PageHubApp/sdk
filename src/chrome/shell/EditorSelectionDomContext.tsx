import { useEditor } from "@craftjs/core";
import { createContext, useContext, useMemo } from "react";

export type SelectionDomContextValue = {
  isActive: (id: string) => boolean;
  isAncestorOfSelected: (id: string) => boolean;
};

const SelectionDomContext = createContext<SelectionDomContextValue | null>(null);

/**
 * Provides selection/ancestor lookups derived once per selection change so
 * per-node renderers avoid each walking the parent chain.
 */
export function EditorSelectionDomProvider({ children }: { children: React.ReactNode }) {
  const selectionSignature = useEditor((_, query) => {
    const all = query.getEvent("selected").all();
    const sortedKey = all.slice().sort().join("\0");
    if (all.length === 0) return "";
    const first = all[0];
    const anc: string[] = [];
    let p = query.node(first).get()?.data?.parent;
    while (p) {
      anc.push(p);
      p = query.node(p).get()?.data?.parent ?? null;
    }
    return sortedKey + "|" + anc.join("\0");
  });

  const { query } = useEditor();

  const value = useMemo((): SelectionDomContextValue => {
    const all = query.getEvent("selected").all();
    const selectedSet = new Set(all);
    const ancestors = new Set<string>();
    const first = all[0];
    if (first) {
      let p = query.node(first).get()?.data?.parent;
      while (p) {
        ancestors.add(p);
        p = query.node(p).get()?.data?.parent ?? null;
      }
    }
    return {
      isActive: (id: string) => selectedSet.has(id),
      isAncestorOfSelected: (id: string) => ancestors.has(id),
    };
  }, [selectionSignature, query]);

  return <SelectionDomContext.Provider value={value}>{children}</SelectionDomContext.Provider>;
}

export function useSelectionDom(): SelectionDomContextValue {
  const ctx = useContext(SelectionDomContext);
  if (!ctx) {
    throw new Error("useSelectionDom must be used under EditorSelectionDomProvider");
  }
  return ctx;
}
