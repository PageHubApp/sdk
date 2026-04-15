/**
 * @pagehub/sdk — Page Navigation Store
 *
 * Module-scoped external store (same pattern as usePanelUrl.ts) that is the
 * single source of truth for which page is active in the editor.
 *
 * Replaces the dual-source problem where ViewportShell watched Next.js
 * router.asPath (stale after pushState) AND PageSelector called isolatePageAlt
 * directly with competing URL management.
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
  /** Parse the current URL to extract a page slug. null = no page slug. */
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
  // Create a new object reference so React sees the change
  currentSnapshot = { ...currentSnapshot };
  for (const l of listeners) l();
}

// ── Popstate (back/forward) ─────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (!initOpts?.urlStrategy) return;
    const slug = initOpts.urlStrategy.parsePageSlug();
    const siteId = initOpts.urlStrategy.parseSiteId();

    if (siteId) currentSnapshot.siteId = siteId;

    if (slug) {
      const pageId = initOpts.resolvePageIdFromSlug(slug);
      if (pageId && pageId !== currentSnapshot.activePageId) {
        currentSnapshot.activePageId = pageId;
        initOpts.onIsolate(pageId);
        notify();
      }
    } else {
      // No page slug = home page
      const homeId = initOpts.getHomePageId();
      if (homeId && homeId !== currentSnapshot.activePageId) {
        currentSnapshot.activePageId = homeId;
        initOpts.onIsolate(homeId);
        notify();
      }
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
 * Navigate to a page. Updates state, pushes URL, and isolates.
 */
export function navigateToPage(
  pageId: string,
  displayName: string,
  isHomePage: boolean,
): void {
  if (!initOpts) return;
  if (pageId === currentSnapshot.activePageId) return;

  currentSnapshot.activePageId = pageId;
  initOpts.onIsolate(pageId);

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

  if (initOpts.urlStrategy) {
    // If we already pushed a page URL, don't clobber it — just update siteId in state.
    // Only replaceState on the FIRST save (no prior siteId) when no page is navigated.
    if (!hadSiteId) {
      // Check if navigateToPage already pushed a URL with this siteId
      const currentPath = window.location.pathname;
      const expectedSiteUrl = initOpts.urlStrategy.buildSiteUrl({ siteId: id });
      // Only replace if the current URL doesn't already contain the site ID
      if (!currentPath.includes(id)) {
        window.history.replaceState({ source: "pageNav", siteId: id }, "", expectedSiteUrl);
      }
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
 * Set active page ID directly (used by ViewportShell for localStorage restore
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
