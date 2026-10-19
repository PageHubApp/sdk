/**
 * @pagehub/sdk — Page Navigation Store
 *
 * Module-scoped external store (same pattern as usePanelUrl.ts) that is the
 * single source of truth for which page is active in the editor.
 *
 * The host app provides a `urlStrategy` via config so the SDK stays
 * host-agnostic (no Next.js, no route-prefix knowledge).
 */

import { useSyncExternalStore } from "react";
import { sdkLog } from "../logger";
import { pageSlugMatches, resolvePageSlug } from "./pageSlug";

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
  /**
   * True when the current URL is one of the editor's own. Optional; omitted =
   * every URL is. A host that keeps the editor mounted on other screens
   * returns false there, so Back / Forward between those screens (and
   * `syncPageFromUrl`) leave the editor's page alone.
   */
  ownsUrl?: () => boolean;
  /**
   * True when a host navigation to `url` leaves the editor mounted (a host
   * that keeps it alive, hidden, behind its other screens). Optional; omitted =
   * every navigation unmounts it. The unsaved-changes prompt only asks before
   * navigations that unmount the editor, since nothing is lost otherwise.
   */
  keepsEditor?: (url: string) => boolean;
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

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a full URL preserving existing query params (panel state, etc.). */
function withCurrentSearch(pathname: string): string {
  const qs = typeof window !== "undefined" ? window.location.search : "";
  return pathname + qs;
}

// ── Module-scoped state ─────────────────────────────────────────────────────

let listeners: Array<() => void> = [];
let currentSnapshot: PageNavState = { activePageId: null, siteId: null };
let initOpts: PageNavInit | null = null;

/** Tracks in-flight isolation to prevent races from rapid page switches. */
let isolationSeq = 0;

/** A page of the site as the server lists it, whether or not its shard is loaded. */
export interface KnownPage {
  id: string;
  /** Canonical URL slug (`resolvePageSlug`). */
  slug: string;
  isHomePage: boolean;
}

/**
 * Every page of the site, from the page list (`PageSelector` feeds it). The
 * tree only holds the shared shard plus the page being edited, so a URL that
 * names any other page — Back / Forward, or a host link into the editor —
 * resolves here.
 */
let knownPages: { siteId: string; pages: KnownPage[] } | null = null;

/** Replace the site's page list used to resolve URLs (see `knownPages`). */
export function setKnownPages(siteId: string, pages: KnownPage[]): void {
  knownPages = { siteId, pages };
}

/** The known pages, only when they belong to the site being edited. */
function knownPagesForSite(): KnownPage[] {
  return knownPages && knownPages.siteId === currentSnapshot.siteId ? knownPages.pages : [];
}

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

const SERVER_SNAPSHOT: PageNavState = { activePageId: null, siteId: null };
function getServerSnapshot(): PageNavState {
  return SERVER_SNAPSHOT;
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
  try {
    await initOpts.onIsolate(pageId);
  } catch (e) {
    sdkLog.error("[PageHub] Page isolation failed:", e);
  }
  if (seq !== isolationSeq) return;
}

// ── URL → active page (back/forward, host navigation) ──────────────────────

/**
 * Show the page the current URL names (the home page when it names none).
 * Runs on every popstate. A host whose own router changed the URL to an
 * editor URL — a link into the editor while it was already mounted and
 * hidden — calls it after that navigation, since a router push fires no
 * popstate. No-op when the URL isn't the editor's (`UrlStrategy.ownsUrl`).
 */
export function syncPageFromUrl(): void {
  const strategy = initOpts?.urlStrategy;
  if (!initOpts || !strategy) return;
  if (strategy.ownsUrl && !strategy.ownsUrl()) return;
  const slug = strategy.parsePageSlug();
  const siteId = strategy.parseSiteId();

  if (siteId) currentSnapshot.siteId = siteId;

  const listed = knownPagesForSite();
  let targetId: string | null = null;
  if (slug) {
    targetId =
      initOpts.resolvePageIdFromSlug(slug) ??
      listed.find(p => pageSlugMatches(p.slug, slug))?.id ??
      null;
  }
  if (!targetId) {
    // The tree's own pick falls back to its first page, which is just the
    // loaded one once another page's shard has replaced the home page.
    targetId = listed.find(p => p.isHomePage)?.id ?? initOpts.getHomePageId();
  }

  if (targetId && targetId !== currentSnapshot.activePageId) {
    currentSnapshot.activePageId = targetId;
    doIsolate(targetId);
    notify();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", syncPageFromUrl);
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
  customSlug?: string
): void {
  if (!initOpts) return;
  if (pageId === currentSnapshot.activePageId) return;

  currentSnapshot.activePageId = pageId;
  doIsolate(pageId);

  // Push URL if we have a strategy and a site ID
  if (initOpts.urlStrategy && currentSnapshot.siteId) {
    const url = initOpts.urlStrategy.buildPageUrl({
      siteId: currentSnapshot.siteId,
      pageSlug: resolvePageSlug({ pageSlug: customSlug, displayName }, pageId),
      isHomePage,
    });
    window.history.pushState({ source: "pageNav", pageId }, "", withCurrentSearch(url));
  }

  notify();
}

/**
 * Called when the host app's first save returns a site ID.
 * Uses replaceState (not pushState) so back doesn't land on the editor URL with no page slug.
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
      window.history.replaceState({ source: "pageNav", siteId: id }, "", withCurrentSearch(url));
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
