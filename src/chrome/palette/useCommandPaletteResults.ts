/**
 * Pure (no-React-required) helpers + a thin React hook for the command palette
 * result list. Filter / score / group logic is extracted so the test suite can
 * exercise it without a DOM.
 *
 * Algorithm:
 *   - Skip commands with `paletteHide: true`.
 *   - Skip commands whose `when(ctx)` returns false.
 *   - With an empty query → return everything, grouped by category.
 *   - With a query → fuzzy subsequence match against `title` + `category`;
 *     score is a small heuristic (prefix hits > word-start hits > scattered).
 *     Sort by score desc, then alphabetically within each category.
 */
import { useMemo } from "react";
import type { CommandContext, CommandDef } from "../../registry/types";

export interface PaletteEntry {
  id: string;
  title: string;
  category: string;
  enabled: boolean;
  score: number;
  def: CommandDef<unknown>;
}

export interface PaletteGroup {
  category: string;
  items: PaletteEntry[];
}

/** Walk a flat list of groups in render order, returning each entry's flat
 * index (for arrow-key navigation). */
export interface FlattenedResults {
  groups: PaletteGroup[];
  flat: PaletteEntry[];
  /** Total result count across all groups. */
  count: number;
}

const DEFAULT_CATEGORY = "Other";

function resolveTitle(
  def: CommandDef<unknown>,
  ctx: CommandContext
): string {
  if (typeof def.title === "function") {
    try {
      return (def.title as (c: CommandContext) => string)(ctx);
    } catch {
      return def.id;
    }
  }
  return def.title;
}

function safeWhen(def: CommandDef<unknown>, ctx: CommandContext): boolean {
  if (!def.when) return true;
  try {
    return Boolean(def.when(ctx));
  } catch {
    return false;
  }
}

function safeEnablement(def: CommandDef<unknown>, ctx: CommandContext): boolean {
  if (!def.enablement) return true;
  try {
    return Boolean(def.enablement(ctx));
  } catch {
    return false;
  }
}

/**
 * Fuzzy subsequence scorer.
 *   - Returns -1 if not all `query` chars appear in `target` in order.
 *   - Higher score = better match (prefix > word-start > scattered).
 *   - Case-insensitive.
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  if (!target) return -1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Prefix match → strong boost.
  if (t.startsWith(q)) return 1000 - (t.length - q.length);

  // Substring contiguous match → moderate boost.
  const idx = t.indexOf(q);
  if (idx >= 0) {
    const wordStart = idx === 0 || /\s/.test(t[idx - 1] ?? "");
    return (wordStart ? 700 : 500) - idx;
  }

  // Subsequence walk.
  let qi = 0;
  let lastIdx = -1;
  let score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      // Bonus for word-start hits.
      const wordStart = i === 0 || /\s/.test(t[i - 1] ?? "");
      score += wordStart ? 8 : 3;
      // Penalty for gaps since the previous hit.
      if (lastIdx >= 0) score -= (i - lastIdx - 1);
      lastIdx = i;
      qi++;
    }
  }
  if (qi < q.length) return -1;
  return score;
}

/**
 * Compute the full filtered + grouped result set for a given commands list,
 * context snapshot, and query string. Pure — used by the React hook and tests.
 */
export function computePaletteResults(
  commands: CommandDef<unknown>[],
  ctx: CommandContext,
  rawQuery: string
): FlattenedResults {
  const query = rawQuery.trim();
  const queryLower = query.toLowerCase();

  const entries: PaletteEntry[] = [];

  for (const def of commands) {
    if (def.paletteHide) continue;
    if (!safeWhen(def, ctx)) continue;
    const title = resolveTitle(def, ctx);
    const category = (def.category || DEFAULT_CATEGORY) as string;

    let score = 0;
    if (queryLower) {
      const titleScore = fuzzyScore(queryLower, title);
      const categoryScore = fuzzyScore(queryLower, category);
      const best = Math.max(titleScore, categoryScore);
      if (best < 0) continue;
      score = best;
    }

    entries.push({
      id: def.id,
      title,
      category,
      enabled: safeEnablement(def, ctx),
      score,
      def,
    });
  }

  // Sort: by score desc when querying, then by title asc.
  entries.sort((a, b) => {
    if (queryLower) {
      if (b.score !== a.score) return b.score - a.score;
    }
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.title.localeCompare(b.title);
  });

  // Group by category, preserving the sorted order.
  const byCategory = new Map<string, PaletteEntry[]>();
  const order: string[] = [];
  for (const entry of entries) {
    let list = byCategory.get(entry.category);
    if (!list) {
      list = [];
      byCategory.set(entry.category, list);
      order.push(entry.category);
    }
    list.push(entry);
  }

  const groups: PaletteGroup[] = order.map(category => ({
    category,
    items: byCategory.get(category)!,
  }));

  // Flat list mirrors render order for arrow-key navigation.
  const flat: PaletteEntry[] = [];
  for (const group of groups) flat.push(...group.items);

  return { groups, flat, count: flat.length };
}

/** React hook wrapper. */
export function useCommandPaletteResults(
  commands: CommandDef<unknown>[],
  ctx: CommandContext,
  query: string
): FlattenedResults {
  return useMemo(
    () => computePaletteResults(commands, ctx, query),
    [commands, ctx, query]
  );
}
