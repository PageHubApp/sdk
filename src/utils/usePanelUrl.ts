import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

export interface PanelUrlState {
  panel: string | null; // "blocks" | "components" | null
  /** Block category when `panel=blocks`; theme tab (`colors`|`styles`|`typography`) when `panel=theme`. */
  cat: string | null;
  sub: string | null; // block subcategory
  sty: string | null; // block style
  q: string | null; // search query
}

const ALL_PANEL_KEYS: Array<keyof PanelUrlState> = ["panel", "cat", "sub", "sty", "q"];

// ── Helpers ─────────────────────────────────────────────────────────────────

function readParams(): PanelUrlState {
  if (typeof window === "undefined") return { panel: null, cat: null, sub: null, sty: null, q: null };
  const sp = new URLSearchParams(window.location.search);
  return {
    panel: sp.get("panel"),
    cat: sp.get("cat"),
    sub: sp.get("sub"),
    sty: sp.get("sty"),
    q: sp.get("q"),
  };
}

function buildUrl(updates: Partial<PanelUrlState>): string {
  const sp = new URLSearchParams(window.location.search);

  for (const key of ALL_PANEL_KEYS) {
    if (key in updates) {
      const val = updates[key];
      if (val) {
        sp.set(key, val);
      } else {
        sp.delete(key);
      }
    }
  }

  const qs = sp.toString();
  return window.location.pathname + (qs ? `?${qs}` : "");
}

function stripAllPanelParams(): string {
  const sp = new URLSearchParams(window.location.search);
  for (const key of ALL_PANEL_KEYS) sp.delete(key);
  const qs = sp.toString();
  return window.location.pathname + (qs ? `?${qs}` : "");
}

// ── External store (single instance, module-scoped) ─────────────────────────

let listeners: Array<() => void> = [];
let currentSnapshot: PanelUrlState = readParams();

// Single popstate handler registered once at module load
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    currentSnapshot = readParams();
    for (const l of listeners) l();
  });
}

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function getSnapshot(): PanelUrlState {
  return currentSnapshot;
}

function getServerSnapshot(): PanelUrlState {
  return { panel: null, cat: null, sub: null, sty: null, q: null };
}

function notify(): void {
  currentSnapshot = readParams();
  for (const l of listeners) l();
}

// ── Hook ────────────────────────────────────────────────────────────────────

export type PanelType = "menu" | "components" | "blocks" | "publish" | "import-export" | "theme";

/** Full-column flyout over the unified settings stack — disable tool column pointer-events and skip click-away close. */
export function isFlyoutBlockingToolColumn(panel: string | null): boolean {
  return (
    panel === "components" ||
    panel === "blocks" ||
    panel === "theme" ||
    panel === "import-export"
  );
}

export function usePanelUrl() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isOpen = state.panel !== null;
  const panel = state.panel as PanelType | null;

  const searchPushedRef = useRef(false);

  // Reset search ref when q disappears (e.g. back button)
  useEffect(() => {
    if (!state.q) searchPushedRef.current = false;
  }, [state.q]);

  /** Open a panel — pushState so back button closes it */
  const open = useCallback((panelType: PanelType, params?: Partial<Omit<PanelUrlState, "panel">>) => {
    const url = buildUrl({ panel: panelType, cat: null, sub: null, sty: null, q: null, ...params });
    history.pushState({ source: "panelUrl" }, "", url);
    notify();
  }, []);

  /** Close panel — pushState stripping all panel params */
  const close = useCallback(() => {
    const url = stripAllPanelParams();
    history.pushState({ source: "panelUrl" }, "", url);
    notify();
  }, []);

  /** Toggle a specific panel — close if it's already open, open otherwise */
  const toggle = useCallback((panelType: PanelType) => {
    const current = readParams();
    if (current.panel === panelType) {
      const url = stripAllPanelParams();
      history.pushState({ source: "panelUrl" }, "", url);
    } else {
      const url = buildUrl({ panel: panelType, cat: null, sub: null, sty: null, q: null });
      history.pushState({ source: "panelUrl" }, "", url);
    }
    notify();
  }, []);

  /** Switch tab — pushState so back button navigates between tabs */
  const switchTab = useCallback((panelType: PanelType) => {
    const url = buildUrl({ panel: panelType, cat: null, sub: null, sty: null, q: null });
    history.pushState({ source: "panelUrl" }, "", url);
    notify();
  }, []);

  /** Navigate to category/subcategory — pushState for breadcrumb back-traversal */
  const navigate = useCallback((params: Partial<PanelUrlState>) => {
    const url = buildUrl(params);
    history.pushState({ source: "panelUrl" }, "", url);
    notify();
  }, []);

  /** Update search/params — replaceState for no history spam */
  const update = useCallback((params: Partial<PanelUrlState>) => {
    const url = buildUrl(params);
    history.replaceState({ source: "panelUrl" }, "", url);
    notify();
  }, []);

  /** Enter search mode — pushState once so back exits search */
  const enterSearchMode = useCallback(() => {
    if (searchPushedRef.current) return;
    searchPushedRef.current = true;
    const url = buildUrl({ cat: null, sub: null, sty: null, q: "" });
    history.pushState({ source: "panelUrl" }, "", url);
    notify();
  }, []);

  /** Reset search ref (call when leaving search) */
  const exitSearchMode = useCallback(() => {
    searchPushedRef.current = false;
  }, []);

  return { state, panel, isOpen, open, close, toggle, switchTab, navigate, update, enterSearchMode, exitSearchMode };
}

// ── Toolbox + history (undo/redo) ───────────────────────────────────────────
// Undo/redo changes Craft selection; EditorNavigation would otherwise treat
// that as "user picked another node" and close Components/Blocks. Call mark
// before history.undo/redo; take() in the close-on-selection effect re-baselines.

let toolboxHistorySelectionSyncPending = false;

export function markToolboxHistorySelectionSync() {
  toolboxHistorySelectionSyncPending = true;
}

/** True once after mark — consume so the next selection delta re-baselines, not closes. */
export function takeToolboxHistorySelectionSyncForRebaseline(): boolean {
  if (!toolboxHistorySelectionSyncPending) return false;
  toolboxHistorySelectionSyncPending = false;
  return true;
}

/** If undo/redo did not change selection, clear a stale mark (after React effects). */
export function finalizeToolboxHistorySelectionSync() {
  setTimeout(() => {
    toolboxHistorySelectionSyncPending = false;
  }, 0);
}
