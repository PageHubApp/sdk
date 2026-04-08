/**
 * Ensures Google Material Symbols CSS is loaded for ref-google: icons when the
 * page does not inject it (marketing block previews, embeds, etc.). The editor
 * loads fonts via Background when enabled; we skip registration there to avoid
 * duplicate subset links.
 */
import { generateOptimizedMaterialSymbolsUrl } from "./data/collectGoogleIcons";

const LINK_ID = "pagehub-auto-material-symbols";

const usageCounts = new Map<string, number>();
let flushScheduled = false;

function applyStylesheetLink() {
  if (typeof document === "undefined") return;

  const names = [...usageCounts.keys()].sort();
  const url = generateOptimizedMaterialSymbolsUrl(names);
  const existing = document.getElementById(LINK_ID) as HTMLLinkElement | null;

  if (!url) {
    existing?.remove();
    return;
  }

  if (existing?.getAttribute("href") === url) {
    // SSR may inject with media="print" for non-blocking load; ensure it's active
    if (existing.media === "print") existing.media = "all";
    return;
  }

  if (existing) existing.remove();
  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    applyStylesheetLink();
  });
}

/** Call when a mounted node uses ref-google:{iconName} (non-editor contexts). */
export function registerMaterialSymbolIconUsage(iconName: string) {
  if (!iconName) return;
  usageCounts.set(iconName, (usageCounts.get(iconName) || 0) + 1);
  scheduleFlush();
}

/** Pair with register when the node unmounts. */
export function unregisterMaterialSymbolIconUsage(iconName: string) {
  const next = (usageCounts.get(iconName) || 0) - 1;
  if (next <= 0) usageCounts.delete(iconName);
  else usageCounts.set(iconName, next);
  scheduleFlush();
}
