/**
 * Runtime CSS allowlist — host-configured constraint on which classes / inline-style
 * properties the editor will accept through `changeProp`. Used for constrained editor
 * modes (e.g. email) where the output medium can't support all CSS.
 *
 * See docs/sdk/host-constraints.md.
 *
 * Set from {@link resolveConfig}; cleared on PageHub destroy.
 * Same single-instance contract as `apiConfig.ts`.
 */

import type { CssAllowlistFeature } from "../types";

let current: CssAllowlistFeature | null = null;

export function setCssAllowlist(allowlist: CssAllowlistFeature | undefined | null): void {
  if (!allowlist || (!allowlist.classes?.length && !allowlist.properties?.length)) {
    current = null;
    return;
  }
  current = allowlist;
}

export function getCssAllowlist(): CssAllowlistFeature | null {
  return current;
}

/**
 * Filter a className string. Tokens (whitespace-separated) survive only if at least
 * one regex in `classes` matches. When no `classes` list is configured, returns input
 * unchanged.
 */
export function filterClassName(value: string): string {
  const allow = current?.classes;
  if (!allow || allow.length === 0) return value;
  if (typeof value !== "string" || !value) return value;
  const tokens = value.split(/\s+/).filter(Boolean);
  const kept = tokens.filter(tok => allow.some(re => re.test(tok)));
  return kept.join(" ");
}

/**
 * Filter an inline style string. Drops declarations whose property name is not in
 * `properties`. When no `properties` list is configured, returns input unchanged.
 *
 * Naive parser: splits on `;`, then on the first `:`. Good enough for editor inputs
 * (no nested at-rules, no comments in practice). Property names are lowercased before
 * comparison; the allowlist is expected to use kebab-case (`background-color`).
 */
export function filterInlineStyle(value: string): string {
  const allow = current?.properties;
  if (!allow || allow.length === 0) return value;
  if (typeof value !== "string" || !value) return value;
  const allowSet = new Set(allow.map(p => p.toLowerCase().trim()));
  const out: string[] = [];
  for (const decl of value.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon < 0) continue;
    const key = trimmed.slice(0, colon).trim().toLowerCase();
    if (!allowSet.has(key)) continue;
    out.push(trimmed);
  }
  return out.length ? out.join("; ") + ";" : "";
}
