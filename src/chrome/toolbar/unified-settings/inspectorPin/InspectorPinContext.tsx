import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { phStorage } from "../../../../utils/phStorage";
import { getSectionDef } from "../registry/propertyRegistry";
import type { SectionId } from "../registry/propertyDefs";

const STORAGE_KEY = "unified-settings-pinned-sections";

/** Not pinnable — component-driven blocks (PropertySection-only feature) and
 *  popover-only sections whose body is a FloatingPanel (no inline content to dock). */
const NON_PINNABLE = new Set<string>([
  "component",
  "modifiers",
  "advanced-settings",
  "import-export",
  "ai-context",
  "permissions",
]);

const MAX_PINS = 10;

function sanitizePinnedIds(raw: unknown): SectionId[] {
  if (!Array.isArray(raw)) return [];
  const out: SectionId[] = [];
  const seen = new Set<string>();
  for (const id of raw) {
    if (typeof id !== "string") continue;
    if (NON_PINNABLE.has(id)) continue;
    if (!getSectionDef(id as SectionId)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id as SectionId);
    if (out.length >= MAX_PINS) break;
  }
  return out;
}

export interface InspectorPinContextValue {
  pinnedIds: SectionId[];
  togglePin: (sectionId: SectionId) => void;
  isPinned: (sectionId: SectionId) => boolean;
  /** Bump when slot nodes register so portaled sections re-render. */
  slotEpoch: number;
  registerSlot: (sectionId: SectionId, el: HTMLElement | null) => void;
  getSlotNode: (sectionId: SectionId) => HTMLElement | null;
}

const InspectorPinContext = createContext<InspectorPinContextValue | null>(null);

export function useInspectorPin(): InspectorPinContextValue {
  const v = useContext(InspectorPinContext);
  if (!v) {
    throw new Error("useInspectorPin must be used within InspectorPinProvider");
  }
  return v;
}

/** Safe no-op when outside provider (e.g. tests); prefer wrapping Provider in app. */
export function useInspectorPinOptional(): InspectorPinContextValue | null {
  return useContext(InspectorPinContext);
}

export function InspectorPinProvider({ children }: { children: React.ReactNode }) {
  const [pinnedIds, setPinnedIds] = useState<SectionId[]>(() =>
    sanitizePinnedIds(phStorage.getJSON(STORAGE_KEY, []))
  );
  const [slotEpoch, setSlotEpoch] = useState(0);
  const slotNodesRef = useRef<Map<string, HTMLElement>>(new Map());

  const persist = useCallback((next: SectionId[]) => {
    try {
      phStorage.set(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const registerSlot = useCallback((sectionId: SectionId, el: HTMLElement | null) => {
    const key = String(sectionId);
    const prev = slotNodesRef.current.get(key) ?? null;
    if (prev === el) return;

    if (el) {
      slotNodesRef.current.set(key, el);
    } else {
      slotNodesRef.current.delete(key);
    }
    setSlotEpoch(e => e + 1);
  }, []);

  const getSlotNode = useCallback((sectionId: SectionId) => {
    return slotNodesRef.current.get(String(sectionId)) ?? null;
  }, []);

  const togglePin = useCallback(
    (sectionId: SectionId) => {
      if (NON_PINNABLE.has(String(sectionId))) return;
      if (!getSectionDef(sectionId)) return;

      setPinnedIds(prev => {
        const idx = prev.indexOf(sectionId);
        let next: SectionId[];
        if (idx >= 0) {
          next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        } else {
          if (prev.length >= MAX_PINS) return prev;
          next = [...prev, sectionId];
        }
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const isPinned = useCallback(
    (sectionId: SectionId) => pinnedIds.indexOf(sectionId) >= 0,
    [pinnedIds]
  );

  const value = useMemo(
    () => ({
      pinnedIds,
      togglePin,
      isPinned,
      slotEpoch,
      registerSlot,
      getSlotNode,
    }),
    [pinnedIds, togglePin, isPinned, slotEpoch, registerSlot, getSlotNode]
  );

  return <InspectorPinContext.Provider value={value}>{children}</InspectorPinContext.Provider>;
}
