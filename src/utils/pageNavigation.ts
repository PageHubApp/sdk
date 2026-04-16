/**
 * @pagehub/sdk — Page Navigation Store
 *
 * Module-scoped external store (same pattern as usePanelUrl.ts) that is the
 * single source of truth for which page is active in the editor.
 *
 * The host app provides a `urlStrategy` via config so the SDK stays
 * host-agnostic (no Next.js, no /build/ prefix knowledge).
 */

import sluggit from "slug";
import { useSyncExternalStore } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

export interface UrlStrategy {
  /** Build a URL path for a given page. */
  buildPageUrl: (ctx: { siteId: string; pageSlug: string; isHomePage: boolean }) => string;
  /** Build a URL path for the site root (home page). */
  buildSiteUrl: (ctx: { siteId: string }) => string;
  /** Parse the current URL to extract a page slug. null = no page slug in URL. */
  parsePageSlug: () => string | null;
  /** Parse the current URL to extract the site ID. null = not yet saved. */
  parseSiteId: () => string | null;
}

export interface PageNavState {
  /** Currently active page node ID (null = nothing isolated). */
  activePageId: string | null;
  /** Site ID from the host (null = unsaved / fresh build). */
  siteId: string | null;
}

interface PageNavInit {
  urlStrategy: UrlStrategy | null;
  /** Resolve a URL slug to a CraftJS page node ID. Used on popstate (back/forward). */
  resolvePageIdFromSlug: (slug: string) => string | null;
  /** Get the home page node ID. */
  getHomePageId: () => string | null;
  /** Called when the store wants to isolate a page in CraftJS. May be async for lazy loading. */
  onIsolate: (pageId: string | null) => void | Promise<void>;
}

// ── Module-scoped state ─────────────────────────────────────────────────────

let listeners: Array<() => void> = [];
let currentSnapshot: PageNavState = { activePageId: null, siteId: null };
let initOpts: PageNavInit | null = null;

/** Tracks in-flight isolation to prevent races from rapid page switches. */
let isolationSeq = 0;

// ── External store API (for useSyncExternalStore) ───────────────────────────

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function getSnapshot(): PageNavState {
  return currentSnapshot;
}

function getServerSnapshot(): PageNavState {
  return { activePageId: null, siteId: null };
}

function notify(): void {
  currentSnapshot = { ...currentSnapshot };
  for (const l of listeners) l();
}

/**
 * Isolate a page with deduplication. If a newer isolation request comes in
 * while a previous one is still in-flight (async lazy load), the older one
 * is abandoned when it completes.
 */
async function doIsolate(pageId: string | null): Promise<void> {
  if (!initOpts) return;
  const seq = ++isolationSeq;
  console.log(`[NavStore] doIsolate(${pageId}) seq=${seq}`);
  try {
    await initOpts.onIsolate(pageId);
    console.log(`[NavStore] doIsolate(${pageId}) completed seq=${seq}, current=${isolationSeq}`);
  } catch (e) {
    console.error("[PageHub] Page isolation failed:", e);
  }
  if (seq !== isolationSeq) return;
}

// ── Popstate (back/forward) ─────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (!initOpts?.urlStrategy) return;
    const slug = initOpts.urlStrategy.parsePageSlug();
    const siteId = initOpts.urlStrategy.parseSiteId();

    if (siteId) currentSnapshot.siteId = siteId;

    let targetId: string | null = null;
    if (slug) {
      targetId = initOpts.resolvePageIdFromSlug(slug);
    }
    if (!targetId) {
      targetId = initOpts.getHomePageId();
    }

    if (targetId && targetId !== currentSnapshot.activePageId) {
      currentSnapshot.activePageId = targetId;
      doIsolate(targetId);
      notify();
    }
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize the page navigation store. Called once from ViewportShell on mount.
 * Returns the initial page ID that should be isolated.
 */
export function initPageNavigation(opts: PageNavInit): string | null {
  initOpts = opts;

  // Read initial state from URL
  if (opts.urlStrategy) {
    currentSnapshot.siteId = opts.urlStrategy.parseSiteId();
    const slug = opts.urlStrategy.parsePageSlug();
    if (slug) {
      const pageId = opts.resolvePageIdFromSlug(slug);
      if (pageId) {
        currentSnapshot.activePageId = pageId;
        notify();
        return pageId;
      }
    }
  }

  // No URL page — use home page
  const homeId = opts.getHomePageId();
  if (homeId) {
    currentSnapshot.activePageId = homeId;
    notify();
  }
  return homeId;
}

/**
 * Update the onIsolate callback. Called when the closure needs refreshing
 * (e.g., when config.callbacks changes).
 */
export function updateOnIsolate(fn: PageNavInit["onIsolate"]): void {
  if (initOpts) initOpts.onIsolate = fn;
}

/**
 * Navigate to a page. Updates state, pushes URL, and isolates.
 */
export function navigateToPage(
  pageId: string,
  displayName: string,
  isHomePage: boolean,
): void {
  if (!initOpts) return;
  if (pageId === currentSnapshot.activePageId) {
    console.log(`[NavStore] navigateToPage(${pageId}) skipped — already active`);
    return;
  }

  console.log(`[NavStore] navigateToPage(${pageId})`);
  currentSnapshot.activePageId = pageId;
  doIsolate(pageId);

  // Push URL if we have a strategy and a site ID
  if (initOpts.urlStrategy && currentSnapshot.siteId) {
    const url = initOpts.urlStrategy.buildPageUrl({
      siteId: currentSnapshot.siteId,
      pageSlug: sluggit(displayName, "-"),
      isHomePage,
    });
    window.history.pushState({ source: "pageNav", pageId }, "", url);
  }

  notify();
}

/**
 * Called when the host app's first save returns a site ID.
 * Uses replaceState (not pushState) so back doesn't go to /build with no slug.
 */
export function setSiteId(id: string): void {
  if (!initOpts) return;
  const hadSiteId = !!currentSnapshot.siteId;
  currentSnapshot.siteId = id;

  if (initOpts.urlStrategy && !hadSiteId) {
    // Only replaceState on the FIRST save (no prior siteId).
    // Check if navigateToPage already pushed a URL with this siteId.
    const currentSiteId = initOpts.urlStrategy.parseSiteId();
    if (currentSiteId !== id) {
      const url = initOpts.urlStrategy.buildSiteUrl({ siteId: id });
      window.history.replaceState({ source: "pageNav", siteId: id }, "", url);
    }
  }

  notify();
}

/** Get the current site ID without subscribing to React updates. */
export function getSiteId(): string | null {
  return currentSnapshot.siteId;
}

/** Get the current active page ID without subscribing. */
export function getActivePageId(): string | null {
  return currentSnapshot.activePageId;
}

/**
 * Set active page ID directly (used for localStorage restore
 * and initial isolation without URL changes).
 */
export function setActivePageId(pageId: string | null): void {
  currentSnapshot.activePageId = pageId;
  notify();
}

// ── React Hook ──────────────────────────────────────────────────────────────

export function usePageNavigation() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    activePageId: state.activePageId,
    siteId: state.siteId,
    navigateToPage,
    setSiteId,
  };
}
