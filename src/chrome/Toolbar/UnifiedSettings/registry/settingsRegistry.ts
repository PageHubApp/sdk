import type { HideKey } from "../types";
import type { SettingsSectionEntry, SettingsTab } from "./types";

// ─── Module-level registry ──────────────────────────────────────────────────

const entries: SettingsSectionEntry[] = [];

/** Register a section. Idempotent by id — re-registering replaces the entry. */
export function registerSection(entry: SettingsSectionEntry): void {
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
}

/** Get a section by id. */
export function getSection(id: string): SettingsSectionEntry | undefined {
  return entries.find((e) => e.id === id);
}

/** Filter options for getSections(). */
export interface GetSectionsFilter {
  /** Only return sections for this tab */
  tab?: SettingsTab;
  /** Search query — matched against title + keywords (case-insensitive) */
  search?: string;
  /** Hide sections whose hideKey is in this set */
  hidden?: Set<HideKey>;
  /** Extra sections merged in (e.g. from toolbar.sections) */
  extraSections?: SettingsSectionEntry[];
}

/**
 * Get all sections, optionally filtered and sorted.
 * Returns a new array — safe to iterate without side effects.
 */
export function getSections(filter?: GetSectionsFilter): SettingsSectionEntry[] {
  let result = [...entries];

  // Merge extra sections (component-scoped)
  if (filter?.extraSections?.length) {
    result = [...result, ...filter.extraSections];
  }

  // Filter out search-only sections when not searching
  if (!filter?.search) {
    result = result.filter((e) => !e.searchOnly);
  }

  // Filter by tab
  if (filter?.tab) {
    result = result.filter((e) => e.tab === filter.tab);
  }

  // Filter by hidden keys
  if (filter?.hidden?.size) {
    result = result.filter((e) => !e.hideKey || !filter.hidden!.has(e.hideKey));
  }

  // Filter by search query
  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    if (q) {
      result = result.filter((e) => {
        if (e.title.toLowerCase().includes(q)) return true;
        return e.keywords.some((kw) => kw.includes(q));
      });
    }
  }

  // Sort by sortOrder (default 100)
  result.sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));

  return result;
}
