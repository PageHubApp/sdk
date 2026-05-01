/**
 * Pure emitter — `DesignTokensSource` → `theme.css` content.
 *
 * Output mirrors the canonical structure of the previous hand-edited
 * `packages/sdk/src/css/theme.css`:
 *  1. Header banner comment
 *  2. `@custom-variant` lines
 *  3. `:root { … }` (light palette + extras + aliases + style tokens + sidebar +
 *     fonts + shadows + tail)
 *  4. `.dark { … }` (dark palette + sidebar dark)
 *  5. `@theme inline { … }` (mapping block — only tokens whose `targets`
 *     include "theme")
 */

import type { DesignTokensSource, NamedVar, ThemeBlockToken } from "./tokenSource";

const HEADER = `/* ═══ @pagehub/sdk Default Theme (DaisyUI 5) ═════════════════════════════════
   Canonical design tokens: palette, aliases, style, shadows, fonts.
   Import this in any Tailwind 4 entry point to get the full DaisyUI 5 theme.

   ⚠️  GENERATED FILE — do not edit. Source: packages/sdk/src/utils/design/tokenSource.ts
   Run \`pnpm exec tsx scripts/generate-theme-css.mjs\` (also runs in prebuild).
   ═════════════════════════════════════════════════════════════════════════════ */`;

const filterTheme = (tokens: ThemeBlockToken[]): ThemeBlockToken[] =>
  tokens.filter(t => t.targets.includes("theme"));

const lineVar = (v: NamedVar, indent = "  "): string => {
  // Multi-line values (e.g. font stacks) start with `\n` — keep the colon flush.
  const sep = v.value.startsWith("\n") ? ":" : ": ";
  return `${indent}${v.name}${sep}${v.value};`;
};

const block = (tokens: NamedVar[], indent = "  "): string =>
  tokens.map(t => lineVar(t, indent)).join("\n");

export function emitThemeCss(source: DesignTokensSource): string {
  const out: string[] = [];

  out.push(HEADER);
  out.push("");

  // Custom variants
  for (const v of source.customVariants) {
    out.push(`@custom-variant dark ${v.selector};`);
  }
  out.push("");

  // ─── :root (light palette + everything static) ────────────────────────────
  out.push("/* ─── Light palette ────────────────────────────────────────────────────────── */");
  out.push("");
  out.push(":root {");
  out.push("  /* DaisyUI 5 canonical tokens (oklch) */");
  out.push(block(source.paletteLight));

  // --border (and any future rootBaseExtras) — special comment for context
  if (source.rootBaseExtras.length > 0) {
    out.push("  /* --border is a WIDTH in DaisyUI 5, not a color. Border color uses --base-300 */");
    out.push(block(source.rootBaseExtras));
  }
  out.push("");

  out.push("  /* Backwards-compat aliases (old shadcn/ui names → DaisyUI 5 names) */");
  out.push(block(source.legacyAliases));
  out.push("");

  out.push("  /* DaisyUI 5 style tokens */");
  // Split style tokens at the radius alias boundary for clarity
  const aliasStart = source.styleTokens.findIndex(t => t.name === "--radius");
  if (aliasStart > 0) {
    out.push(block(source.styleTokens.slice(0, aliasStart)));
    out.push("  /* Radius aliases */");
    out.push(block(source.styleTokens.slice(aliasStart)));
  } else {
    out.push(block(source.styleTokens));
  }
  out.push("");

  // Sidebar root defs — light values only here
  if (source.sidebarRootDefs.length > 0) {
    out.push("  /* Sidebar chrome (editor only — kept here so --color-sidebar-* aliases resolve) */");
    out.push(
      source.sidebarRootDefs
        .map(s => lineVar({ name: s.name, value: s.light }))
        .join("\n")
    );
    out.push("");
  }

  out.push("  /* Font stacks */");
  out.push(block(source.fontStacks));
  out.push("");

  out.push("  /* Shadow primitives */");
  out.push(block(source.shadowPrimitives));
  out.push("  /* Shadow composites */");
  out.push(block(source.shadowComposites));
  out.push("");

  out.push(block(source.rootTail));
  out.push("}");
  out.push("");

  // ─── .dark (dark palette + sidebar dark overrides) ────────────────────────
  out.push("/* ─── Dark palette ─────────────────────────────────────────────────────────── */");
  out.push("");
  out.push(".dark {");
  out.push(block(source.paletteDark));
  if (source.sidebarRootDefs.some(s => s.dark !== s.light)) {
    out.push(
      source.sidebarRootDefs
        .filter(s => s.dark !== s.light)
        .map(s => lineVar({ name: s.name, value: s.dark }))
        .join("\n")
    );
  }
  out.push("}");
  out.push("");

  // ─── @theme inline ────────────────────────────────────────────────────────
  out.push("/* ─── Tailwind Theme Mapping ───────────────────────────────────────────────── */");
  out.push("");
  out.push("@theme inline {");

  out.push("  /* DaisyUI 5 canonical color tokens */");
  out.push(block(filterTheme(source.themeColors)));
  out.push("");

  out.push("  /* Backwards-compat Tailwind color aliases */");
  out.push(block(filterTheme(source.themeColorAliases)));

  const sidebar = filterTheme(source.themeSidebarColors);
  if (sidebar.length > 0) {
    out.push("  /* Sidebar (editor chrome) */");
    out.push(block(sidebar));
  }
  out.push("");

  out.push("  /* Fonts */");
  out.push(block(filterTheme(source.themeFonts)));
  out.push("");

  const spacing = filterTheme(source.themeSpacing);
  if (spacing.length > 0) {
    out.push("  /* Spatial scale */");
    out.push(block(spacing));
    out.push("");
  }
  const maxw = filterTheme(source.themeMaxWidth);
  if (maxw.length > 0) {
    out.push(block(maxw));
    out.push("");
  }

  out.push("  /* Border Radius */");
  out.push(block(filterTheme(source.themeRadius)));
  out.push("");

  const shadows = filterTheme(source.themeShadows);
  if (shadows.length > 0) {
    out.push("  /* Shadows */");
    out.push(block(shadows));
    out.push("");
  }

  const animations = filterTheme(source.themeAnimations);
  if (animations.length > 0) {
    out.push("  /* CSS Animation Presets — keep in sync with packages/sdk/src/css/styles.css */");
    out.push(block(animations));
    out.push("");
  }

  // Strip trailing blank line inside the @theme block
  while (out[out.length - 1] === "") out.pop();
  out.push("}");
  out.push("");

  return out.join("\n");
}
