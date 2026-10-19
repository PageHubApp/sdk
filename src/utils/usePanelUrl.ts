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

const EMPTY_STATE: PanelUrlState = { panel: null, cat: null, sub: null, sty: null, q: null };

/**
 * Read the panel state from a query string. Each key is read as
 * `<prefix><key>` (`ed_panel`, `ed_cat`, …) so a host page can keep its own
 * params alongside the editor's.
 */
export function readPanelParams(search: string, prefix = ""): PanelUrlState {
  const sp = new URLSearchParams(search);
  const state = { ...EMPTY_STATE };
  for (const key of ALL_PANEL_KEYS) state[key] = sp.get(prefix + key);
  return state;
}

/** Apply panel updates to a query string; a falsy value removes its key. Returns the query without `?`. */
export function writePanelParams(
  search: string,
  updates: Partial<PanelUrlState>,
  prefix = ""
): string {
  const sp = new URLSearchParams(search);
  for (const key of ALL_PANEL_KEYS) {
    if (!(key in updates)) continue;
    const val = updates[key];
    if (val) sp.set(prefix + key, val);
    else sp.delete(prefix + key);
  }
  return sp.toString();
}

/** Remove every panel key from a query string. Returns the query without `?`. */
export function stripPanelParams(search: string, prefix = ""): string {
  const sp = new URLSearchParams(search);
  for (const key of ALL_PANEL_KEYS) sp.delete(prefix + key);
  return sp.toString();
}

/** Param prefix for the mounted editor (`features.panelUrlPrefix`); "" when the host sets none. */
let paramPrefix = "";

function readParams(): PanelUrlState {
  if (typeof window === "undefined") return EMPTY_STATE;
  return readPanelParams(window.location.search, paramPrefix);
}

function withQuery(qs: string): string {
  return window.location.pathname + (qs ? `?${qs}` : "");
}

function buildUrl(updates: Partial<PanelUrlState>): string {
  return withQuery(writePanelParams(window.location.search, updates, paramPrefix));
}

function stripAllPanelParams(): string {
  return withQuery(stripPanelParams(window.location.search, paramPrefix));
}

// ── External store (single instance, module-scoped) ─────────────────────────

let listeners: Array<() => void> = [];
let currentSnapshot: PanelUrlState = readParams();

/** Remember Components/Blocks URL (tab, category, filters) so reopen (+) restores after auto-close. */
let lastToolboxSnapshot: PanelUrlState | null = null;

function syncLastToolboxFromPanelState(state: PanelUrlState): void {
  if (state.panel === "components" || state.panel === "blocks") {
    lastToolboxSnapshot = {
      panel: state.panel,
      cat: state.cat,
      sub: state.sub,
      sty: state.sty,
      q: state.q,
    };
  }
}

syncLastToolboxFromPanelState(currentSnapshot);

// Single popstate handler registered once at module load
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    currentSnapshot = readParams();
    syncLastToolboxFromPanelState(currentSnapshot);
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
  return EMPTY_STATE;
}

function notify(): void {
  currentSnapshot = readParams();
  syncLastToolboxFromPanelState(currentSnapshot);
  for (const l of listeners) l();
}

/**
 * Set the param prefix the panel keys are read and written with. Called by
 * `PageHubEditor` from `features.panelUrlPrefix`; re-reads the URL so open
 * panels follow the new names.
 */
export function setPanelUrlPrefix(prefix: string): void {
  if (prefix === paramPrefix) return;
  paramPrefix = prefix;
  if (typeof window !== "undefined") notify();
}

// ── Non-hook accessors (for command `run` bodies) ───────────────────────────

/**
 * `layers` is only used by hosts that show the layer tree as a tab of their
 * own panel (`layout="none"`); the default drawer ignores it.
 */
export type PanelType = "menu" | "components" | "blocks" | "publish" | "theme" | "layers";

/** Open a panel from outside React (registry commands, dispatcher). */
export function panelOpen(
  panelType: PanelType,
  params?: Partial<Omit<PanelUrlState, "panel">>
): void {
  if (typeof window === "undefined") return;
  const url = buildUrl({
    panel: panelType,
    cat: null,
    sub: null,
    sty: null,
    q: null,
    ...params,
  });
  history.pushState({ source: "panelUrl" }, "", url);
  notify();
}

/** Close any open panel from outside React. */
export function panelClose(): void {
  if (typeof window === "undefined") return;
  const url = stripAllPanelParams();
  history.pushState({ source: "panelUrl" }, "", url);
  notify();
}

/** Toggle a specific panel from outside React (close if open, else open). */
export function panelToggle(
  panelType: PanelType,
  params?: Partial<Omit<PanelUrlState, "panel">>
): void {
  if (typeof window === "undefined") return;
  const current = readParams();
  if (current.panel === panelType) {
    const url = stripAllPanelParams();
    history.pushState({ source: "panelUrl" }, "", url);
  } else {
    const url = buildUrl({
      panel: panelType,
      cat: null,
      sub: null,
      sty: null,
      q: null,
      ...params,
    });
    history.pushState({ source: "panelUrl" }, "", url);
  }
  notify();
}

/** Toggle the toolbox insert panel (components/blocks) from outside React. */
export function panelToggleToolboxInsert(): void {
  if (typeof window === "undefined") return;
  const current = readParams();
  if (current.panel === "components" || current.panel === "blocks") {
    const url = stripAllPanelParams();
    history.pushState({ source: "panelUrl" }, "", url);
  } else {
    const snap = lastToolboxSnapshot;
    const panel = snap?.panel === "blocks" ? "blocks" : "components";
    const url = buildUrl({
      panel,
      cat: snap?.cat ?? null,
      sub: snap?.sub ?? null,
      sty: snap?.sty ?? null,
      q: snap?.q ?? null,
    });
    history.pushState({ source: "panelUrl" }, "", url);
  }
  notify();
}

/** Read the current panel state from outside React. */
export function getPanelState(): PanelUrlState {
  return currentSnapshot;
}

// ── Hook ────────────────────────────────────────────────────────────────────

/** Full-column flyout over the unified settings stack — disable tool column pointer-events and skip click-away close. */
export function isFlyoutBlockingToolColumn(panel: string | null): boolean {
  return panel === "components" || panel === "blocks" || panel === "theme";
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
  const open = useCallback(
    (panelType: PanelType, params?: Partial<Omit<PanelUrlState, "panel">>) => {
      panelOpen(panelType, params);
    },
    []
  );

  /** Close panel — pushState stripping all panel params */
  const close = useCallback(() => {
    panelClose();
  }, []);

  /** Toggle a specific panel — close if it's already open, open otherwise */
  const toggle = useCallback(
    (panelType: PanelType, params?: Partial<Omit<PanelUrlState, "panel">>) => {
      panelToggle(panelType, params);
    },
    []
  );

  /**
   * Header (+): toggles Components/Blocks insert flyout. When opening from closed, restores
   * last tab + category/filters (survives auto-close on canvas selection).
   */
  const toggleToolboxInsert = useCallback(() => {
    panelToggleToolboxInsert();
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

  return {
    state,
    panel,
    isOpen,
    open,
    close,
    toggle,
    toggleToolboxInsert,
    switchTab,
    navigate,
    update,
    enterSearchMode,
    exitSearchMode,
  };
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
