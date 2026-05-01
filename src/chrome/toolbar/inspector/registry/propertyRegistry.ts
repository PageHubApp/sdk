/**
 * Property registry — the public API for the settings panel property system.
 *
 * SDK consumers can register, override, and remove properties and sections.
 * All built-in properties are registered at module load via the properties/ barrel.
 *
 * Exported from @pagehub/sdk so external consumers can extend the sidebar.
 */
import type { HideKey } from "../types";
import type { SettingsTab } from "./types";
import type { PropertyDef, SectionDef, SectionId } from "./propertyDefs";

// ─── Internal state ────────────────────────────────────────────────────────

const properties: PropertyDef[] = [];
const sections: SectionDef[] = [];

// Lookup caches — invalidated on mutation
let propertiesBySection: Map<SectionId, PropertyDef[]> | null = null;
let sectionById: Map<SectionId, SectionDef> | null = null;

function invalidateCache() {
  propertiesBySection = null;
  sectionById = null;
}

function ensureSectionIndex(): Map<SectionId, SectionDef> {
  if (!sectionById) {
    sectionById = new Map(sections.map(s => [s.id, s]));
  }
  return sectionById;
}

function ensurePropertyIndex(): Map<SectionId, PropertyDef[]> {
  if (!propertiesBySection) {
    propertiesBySection = new Map();
    for (const p of properties) {
      const arr = propertiesBySection.get(p.section);
      if (arr) arr.push(p);
      else propertiesBySection.set(p.section, [p]);
    }
  }
  return propertiesBySection;
}

// ─── Section API ───────────────────────────────────────────────────────────

/** Register a section. Idempotent by id — re-registering replaces. */
export function registerSectionDef(def: SectionDef): void {
  const idx = sections.findIndex(s => s.id === def.id);
  if (idx >= 0) sections[idx] = def;
  else sections.push(def);
  invalidateCache();
}

/** Remove a section and all its properties. */
export function unregisterSectionDef(id: SectionId): void {
  const idx = sections.findIndex(s => s.id === id);
  if (idx >= 0) sections.splice(idx, 1);
  // Remove orphaned properties
  for (let i = properties.length - 1; i >= 0; i--) {
    if (properties[i].section === id) properties.splice(i, 1);
  }
  invalidateCache();
}

/** Get all registered sections, optionally filtered by tab. Sorted by sortOrder. */
export function getSectionDefs(filter?: { tab?: SettingsTab }): SectionDef[] {
  let result = [...sections];
  if (filter?.tab) result = result.filter(s => s.tab === filter.tab);
  result.sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
  return result;
}

/** Get a single section by ID. */
export function getSectionDef(id: SectionId): SectionDef | undefined {
  return ensureSectionIndex().get(id);
}

// ─── Property API ──────────────────────────────────────────────────────────

/** Register properties. Idempotent by id — re-registering replaces. */
export function registerProperties(defs: PropertyDef[]): void {
  for (const def of defs) {
    const idx = properties.findIndex(p => p.id === def.id);
    if (idx >= 0) properties[idx] = def;
    else properties.push(def);
  }
  invalidateCache();
}

/** Override a single property by id. Merges patch with existing def. */
export function overrideProperty(id: string, patch: Partial<PropertyDef>): void {
  const idx = properties.findIndex(p => p.id === id);
  if (idx >= 0) {
    properties[idx] = { ...properties[idx], ...patch };
    invalidateCache();
  }
}

/** Remove a property by id. */
export function unregisterProperty(id: string): void {
  const idx = properties.findIndex(p => p.id === id);
  if (idx >= 0) {
    properties.splice(idx, 1);
    invalidateCache();
  }
}

// ─── Query API ─────────────────────────────────────────────────────────────

export interface GetPropertiesFilter {
  /** Only properties in this section */
  section?: SectionId;
  /** Search query — matched against label + keywords + id (case-insensitive) */
  search?: string;
  /** Hide properties whose hideKey is in this set */
  hidden?: Set<HideKey>;
  /** Also hide properties whose id is in this set */
  hiddenIds?: Set<string>;
  /** Include searchOnly properties (default: only when search is active) */
  includeSearchOnly?: boolean;
}

/**
 * Get properties, filtered and sorted.
 * Returns a new array — safe to mutate.
 */
export function getProperties(filter?: GetPropertiesFilter): PropertyDef[] {
  let result: PropertyDef[];

  // Fast path: section lookup via index
  if (filter?.section) {
    result = [...(ensurePropertyIndex().get(filter.section) || [])];
  } else {
    result = [...properties];
  }

  // Filter out searchOnly when not searching
  if (!filter?.search && !filter?.includeSearchOnly) {
    result = result.filter(p => !p.searchOnly);
  }

  // Filter by hidden keys
  if (filter?.hidden?.size) {
    result = result.filter(p => !p.hideKey || !filter.hidden!.has(p.hideKey));
  }

  // Filter by hidden property IDs
  if (filter?.hiddenIds?.size) {
    result = result.filter(p => !filter.hiddenIds!.has(p.id));
  }

  // Filter by search query
  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    if (q) {
      // Also match against section title for context
      const secIndex = ensureSectionIndex();
      result = result.filter(p => {
        if (p.label.toLowerCase().includes(q)) return true;
        if (p.id.toLowerCase().includes(q)) return true;
        if (p.keywords.some(kw => kw.includes(q))) return true;
        const sec = secIndex.get(p.section);
        if (sec && sec.title.toLowerCase().includes(q)) return true;
        return false;
      });
    }
  }

  // Sort by sortOrder (default 100)
  result.sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
  return result;
}

/**
 * Search properties by query string.
 * Returns results grouped by section for rendering.
 */
export function searchProperties(
  query: string,
  hidden?: Set<HideKey>,
  hiddenIds?: Set<string>
): Map<SectionId, PropertyDef[]> {
  const matches = getProperties({ search: query, hidden, hiddenIds, includeSearchOnly: true });
  const grouped = new Map<SectionId, PropertyDef[]>();
  for (const p of matches) {
    const arr = grouped.get(p.section);
    if (arr) arr.push(p);
    else grouped.set(p.section, [p]);
  }
  return grouped;
}

// ─── Introspection (for testing / debugging) ───────────────────────────────

/** Get count of registered properties. */
export function getPropertyCount(): number {
  return properties.length;
}

/** Get count of registered sections. */
export function getSectionDefCount(): number {
  return sections.length;
}
