/**
 * Pure emitter — `DesignTokensSource` → browser-runtime `THEME_CSS` string.
 *
 * Output mirrors the canonical structure of the previous hardcoded `THEME_CSS`
 * constant in `packages/sdk/src/core/tailwindBrowser.ts`:
 *
 *  1. `@custom-variant` lines
 *  2. `@theme inline { … }` (mapping block — only tokens whose `targets`
 *     include "browser")
 *
 * The browser runtime DOES NOT need the static `:root` palette block — that
 * gets injected at runtime by `designSystemVars.ts` from the per-site theme.
 */

import type { DesignTokensSource, NamedVar, ThemeBlockToken } from "./tokenSource";

const filterBrowser = (tokens: ThemeBlockToken[]): ThemeBlockToken[] =>
  tokens.filter(t => t.targets.includes("browser"));

const lineVar = (v: NamedVar, indent = "  "): string => `${indent}${v.name}: ${v.value};`;
const block = (tokens: NamedVar[], indent = "  "): string =>
  tokens.map(t => lineVar(t, indent)).join("\n");

export function emitBrowserThemeCss(source: DesignTokensSource): string {
  const out: string[] = [];

  // Leading blank line matches the original `\n` after the backtick
  out.push("");

  for (const v of source.customVariants) {
    out.push(`@custom-variant dark ${v.selector};`);
  }
  out.push("");

  out.push("@theme inline {");

  out.push("  /* DaisyUI 5 canonical tokens */");
  out.push(block(filterBrowser(source.themeColors)));
  const sidebar = filterBrowser(source.themeSidebarColors);
  if (sidebar.length > 0) out.push(block(sidebar));
  out.push("");

  out.push(block(filterBrowser(source.themeFonts)));
  out.push("");

  const spacing = filterBrowser(source.themeSpacing);
  if (spacing.length > 0) {
    out.push("  /* Spatial scale: py-space-xl, gap-space-md, px-space-sm, etc. */");
    out.push(block(spacing));
  }
  const maxw = filterBrowser(source.themeMaxWidth);
  if (maxw.length > 0) {
    out.push(block(maxw));
  }
  out.push("");

  out.push("  /* Radius */");
  out.push(block(filterBrowser(source.themeRadius)));
  out.push("");

  const animations = filterBrowser(source.themeAnimations);
  if (animations.length > 0) {
    out.push("  /* CSS Animation Presets — keep in sync with packages/sdk/src/css/styles.css */");
    out.push(block(animations));
  }

  while (out[out.length - 1] === "") out.pop();
  out.push("}");
  out.push("");

  return out.join("\n");
}
