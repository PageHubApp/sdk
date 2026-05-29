/**
 * @pagehub/sdk — Static design-token schema (Phase 0a)
 *
 * The single source-of-truth for tokens that ship with the SDK and don't
 * change per-site:
 *  - DaisyUI 5 default palette (light + dark)
 *  - Backwards-compat aliases (shadcn/ui-style names → DaisyUI 5)
 *  - Style tokens (radius scale, sizes, depth/noise)
 *  - Font stacks (system sans/serif/mono)
 *  - Shadow primitives + composites
 *  - Spatial scale aliases (consumed by `@pagehub/daisyui-spatial`)
 *  - Animation preset shortcuts (paired with @keyframes in styles.css)
 *  - Sidebar chrome vars (editor-only)
 *
 * Two artifacts are emitted from this:
 *  - `packages/sdk/src/css/theme.css` (via `emitThemeCss`)
 *  - `packages/sdk/src/core/themeInline.generated.ts` (via `emitBrowserThemeCss`,
 *    consumed by `tailwindBrowser.ts` for the editor's runtime Tailwind v4 compiler)
 *
 * Each `@theme inline` token carries a `targets` array selecting which output(s)
 * it lands in — the two outputs are overlapping but DIVERGENT (shadows are
 * theme-only; animations + spatial are browser-only; everything else is both).
 *
 * Per-site author overrides (`ROOT.props.theme.palette` / `styleGuide` /
 * `typography`) are unrelated — they get turned into CSS vars at runtime by
 * `designSystemVars.ts`. The two layers compose at `:root`.
 */

export type TokenTarget = "theme" | "browser";

export interface NamedVar {
  name: string;
  value: string;
}

export interface ThemeBlockToken extends NamedVar {
  targets: TokenTarget[];
}

export interface SidebarRootDef {
  name: string;
  light: string;
  dark: string;
}

export interface DesignTokensSource {
  customVariants: { selector: string }[];

  /** Light palette — emitted to `:root { … }` in theme.css. */
  paletteLight: NamedVar[];

  /** Dark palette — emitted to `.dark { … }` in theme.css. */
  paletteDark: NamedVar[];

  /** `--border` width + `--tracking-normal` + `--spacing` primitive. */
  rootBaseExtras: NamedVar[];

  /** DaisyUI 5 style tokens — radius/size/depth/noise + radius aliases (theme.css `:root`). */
  styleTokens: NamedVar[];

  /** Sidebar chrome vars, defined in theme.css `:root` + `.dark` to fix dangling refs. */
  sidebarRootDefs: SidebarRootDef[];

  /** Font stacks (theme.css `:root`). Multi-line — newlines preserved. */
  fontStacks: NamedVar[];

  /** Shadow primitives (`--shadow-x`, etc.). */
  shadowPrimitives: NamedVar[];

  /** Shadow composites (`--shadow-2xs`, ...). */
  shadowComposites: NamedVar[];

  /** Trailing :root vars after shadows (`--tracking-normal`, `--spacing`). */
  rootTail: NamedVar[];

  /** Tokens emitted inside `@theme inline { … }` — per-target. */
  themeColors: ThemeBlockToken[];
  themeSidebarColors: ThemeBlockToken[];
  themeFonts: ThemeBlockToken[];
  themeSpacing: ThemeBlockToken[];
  themeMaxWidth: ThemeBlockToken[];
  themeRadius: ThemeBlockToken[];
  themeShadows: ThemeBlockToken[];
  themeAnimations: ThemeBlockToken[];
}

// ─── Canonical source data ───────────────────────────────────────────────────

const BOTH: TokenTarget[] = ["theme", "browser"];
const THEME_ONLY: TokenTarget[] = ["theme"];
const BROWSER_ONLY: TokenTarget[] = ["browser"];

export const DESIGN_TOKENS_SOURCE: DesignTokensSource = {
  customVariants: [
    { selector: "(&:is(.dark *):not(#viewport:not(.dark) *))" },
  ],

  paletteLight: [
    { name: "--primary", value: "oklch(14% 0 0)" },
    { name: "--primary-content", value: "oklch(100% 0 0)" },
    { name: "--secondary", value: "oklch(96.5% 0 0)" },
    { name: "--secondary-content", value: "oklch(14% 0 0)" },
    { name: "--accent", value: "oklch(96.5% 0 0)" },
    { name: "--accent-content", value: "oklch(14% 0 0)" },
    { name: "--neutral", value: "oklch(96.5% 0 0)" },
    { name: "--neutral-content", value: "oklch(55% 0 0)" },
    { name: "--base-100", value: "oklch(100% 0 0)" },
    { name: "--base-200", value: "oklch(100% 0 0)" },
    { name: "--base-300", value: "oklch(92% 0 0)" },
    { name: "--base-content", value: "oklch(0% 0 0)" },
    { name: "--error", value: "oklch(63.7% 0.208 26.3)" },
    { name: "--error-content", value: "oklch(98% 0 0)" },
    { name: "--info", value: "oklch(62% 0.214 259)" },
    { name: "--info-content", value: "oklch(100% 0 0)" },
    { name: "--success", value: "oklch(62% 0.178 155)" },
    { name: "--success-content", value: "oklch(100% 0 0)" },
    { name: "--warning", value: "oklch(75% 0.183 70)" },
    { name: "--warning-content", value: "oklch(0% 0 0)" },
    { name: "--ring", value: "oklch(14% 0 0)" },
  ],

  rootBaseExtras: [
    { name: "--border", value: "1px" },
  ],

  styleTokens: [
    { name: "--radius-box", value: "0.5rem" },
    { name: "--radius-field", value: "0.25rem" },
    { name: "--radius-selector", value: "0.5rem" },
    { name: "--size-field", value: "0.25rem" },
    { name: "--size-selector", value: "0.25rem" },
    { name: "--depth", value: "1" },
    { name: "--noise", value: "0" },
    { name: "--radius", value: "var(--radius-box)" },
    { name: "--card-radius", value: "var(--radius-box)" },
    { name: "--input-border-radius", value: "var(--radius-field)" },
  ],

  // Phase 0a fix: previously --color-sidebar-* in @theme inline (browser only)
  // referenced --sidebar-foreground / --sidebar-border which were never defined.
  // Add defs in :root + .dark so the chrome vars resolve.
  sidebarRootDefs: [
    { name: "--sidebar-foreground", light: "var(--base-content)", dark: "var(--base-content)" },
    { name: "--sidebar-border", light: "var(--base-300)", dark: "var(--base-300)" },
  ],

  fontStacks: [
    {
      name: "--font-sans",
      value:
        '\n    ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,\n    "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji",\n    "Segoe UI Symbol", "Noto Color Emoji"',
    },
    {
      name: "--font-serif",
      value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    },
    {
      name: "--font-mono",
      value:
        '\n    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",\n    monospace',
    },
  ],

  shadowPrimitives: [
    { name: "--shadow-x", value: "1px" },
    { name: "--shadow-y", value: "2px" },
    { name: "--shadow-blur", value: "4.5px" },
    { name: "--shadow-spread", value: "0px" },
    { name: "--shadow-opacity", value: "0.14" },
    { name: "--shadow-color", value: "#000000" },
  ],

  shadowComposites: [
    { name: "--shadow-2xs", value: "1px 2px 4.5px 0px hsl(0 0% 0% / 0.07)" },
    { name: "--shadow-xs", value: "1px 2px 4.5px 0px hsl(0 0% 0% / 0.07)" },
    {
      name: "--shadow-sm",
      value: "1px 2px 4.5px 0px hsl(0 0% 0% / 0.14), 1px 1px 2px -1px hsl(0 0% 0% / 0.14)",
    },
    {
      name: "--shadow",
      value: "1px 2px 4.5px 0px hsl(0 0% 0% / 0.14), 1px 1px 2px -1px hsl(0 0% 0% / 0.14)",
    },
    {
      name: "--shadow-md",
      value: "1px 2px 4.5px 0px hsl(0 0% 0% / 0.14), 1px 2px 4px -1px hsl(0 0% 0% / 0.14)",
    },
    {
      name: "--shadow-lg",
      value: "1px 2px 4.5px 0px hsl(0 0% 0% / 0.14), 1px 4px 6px -1px hsl(0 0% 0% / 0.14)",
    },
    {
      name: "--shadow-xl",
      value: "1px 2px 4.5px 0px hsl(0 0% 0% / 0.14), 1px 8px 10px -1px hsl(0 0% 0% / 0.14)",
    },
    { name: "--shadow-2xl", value: "1px 2px 4.5px 0px hsl(0 0% 0% / 0.35)" },
  ],

  rootTail: [
    { name: "--tracking-normal", value: "0em" },
    { name: "--spacing", value: "0.25rem" },
  ],

  paletteDark: [
    { name: "--primary", value: "oklch(98% 0 0)" },
    { name: "--primary-content", value: "oklch(14% 0 0)" },
    { name: "--secondary", value: "oklch(24% 0 0)" },
    { name: "--secondary-content", value: "oklch(98% 0 0)" },
    { name: "--accent", value: "oklch(32% 0 0)" },
    { name: "--accent-content", value: "oklch(98% 0 0)" },
    { name: "--neutral", value: "oklch(20% 0 0)" },
    { name: "--neutral-content", value: "oklch(78% 0 0)" },
    { name: "--base-100", value: "oklch(12% 0 0)" },
    { name: "--base-200", value: "oklch(18% 0 0)" },
    { name: "--base-300", value: "oklch(32% 0 0)" },
    { name: "--base-content", value: "oklch(98% 0 0)" },
    { name: "--error", value: "oklch(55% 0.15 26)" },
    { name: "--error-content", value: "oklch(98% 0 0)" },
    { name: "--info", value: "oklch(62% 0.214 259)" },
    { name: "--info-content", value: "oklch(14% 0 0)" },
    { name: "--success", value: "oklch(62% 0.178 155)" },
    { name: "--success-content", value: "oklch(14% 0 0)" },
    { name: "--warning", value: "oklch(75% 0.183 70)" },
    { name: "--warning-content", value: "oklch(14% 0 0)" },
    { name: "--ring", value: "oklch(85% 0 0)" },
  ],

  // ─── @theme inline tokens (per-target) ────────────────────────────────────

  themeColors: [
    { name: "--color-primary", value: "var(--primary)", targets: BOTH },
    { name: "--color-primary-content", value: "var(--primary-content)", targets: BOTH },
    { name: "--color-secondary", value: "var(--secondary)", targets: BOTH },
    { name: "--color-secondary-content", value: "var(--secondary-content)", targets: BOTH },
    { name: "--color-accent", value: "var(--accent)", targets: BOTH },
    { name: "--color-accent-content", value: "var(--accent-content)", targets: BOTH },
    { name: "--color-neutral", value: "var(--neutral)", targets: BOTH },
    { name: "--color-neutral-content", value: "var(--neutral-content)", targets: BOTH },
    { name: "--color-base-100", value: "var(--base-100)", targets: BOTH },
    { name: "--color-base-200", value: "var(--base-200)", targets: BOTH },
    { name: "--color-base-300", value: "var(--base-300)", targets: BOTH },
    { name: "--color-base-content", value: "var(--base-content)", targets: BOTH },
    { name: "--color-error", value: "var(--error)", targets: BOTH },
    { name: "--color-error-content", value: "var(--error-content)", targets: BOTH },
    { name: "--color-info", value: "var(--info)", targets: BOTH },
    { name: "--color-info-content", value: "var(--info-content)", targets: BOTH },
    { name: "--color-success", value: "var(--success)", targets: BOTH },
    { name: "--color-success-content", value: "var(--success-content)", targets: BOTH },
    { name: "--color-warning", value: "var(--warning)", targets: BOTH },
    { name: "--color-warning-content", value: "var(--warning-content)", targets: BOTH },
    { name: "--color-border", value: "var(--base-300)", targets: BOTH },
    { name: "--color-input", value: "var(--base-300)", targets: BOTH },
    { name: "--color-ring", value: "var(--ring)", targets: BOTH },
  ],

  themeSidebarColors: [
    // Sidebar chrome (editor only). Kept browser-only to avoid leaking editor
    // chrome vars into published-site CSS — theme.css ships to viewers too.
    { name: "--color-sidebar-foreground", value: "var(--sidebar-foreground)", targets: BROWSER_ONLY },
    { name: "--color-sidebar-border", value: "var(--sidebar-border)", targets: BROWSER_ONLY },
  ],

  themeFonts: [
    // theme.css uses bare `var(--font-sans)`, browser appends `, sans-serif`/etc.
    // Schema keeps both shapes by per-target value override.
    // sans/serif/mono fall back through styleGuide.{sans,serif,mono}FontFamily when set,
    // so `font-mono` etc. actually render in the theme's chosen family. When the styleGuide
    // key is absent, the cascade lands on the root system stacks (rootFonts).
    { name: "--font-sans", value: "var(--sans-font-family, var(--font-sans))", targets: THEME_ONLY },
    { name: "--font-mono", value: "var(--mono-font-family, var(--font-mono))", targets: THEME_ONLY },
    { name: "--font-serif", value: "var(--serif-font-family, var(--font-serif))", targets: THEME_ONLY },
    { name: "--font-sans", value: "var(--sans-font-family, var(--font-sans)), sans-serif", targets: BROWSER_ONLY },
    { name: "--font-serif", value: "var(--serif-font-family, var(--font-serif)), serif", targets: BROWSER_ONLY },
    { name: "--font-mono", value: "var(--mono-font-family, var(--font-mono)), monospace", targets: BROWSER_ONLY },
    { name: "--font-heading", value: "var(--heading-font-family), sans-serif", targets: BOTH },
    { name: "--font-body", value: "var(--body-font-family), sans-serif", targets: BOTH },
    { name: "--font-accent", value: "var(--accent-font-family), sans-serif", targets: BOTH },
  ],

  themeSpacing: [
    // Browser-only — editor needs Tailwind to know about p-space-*, gap-space-*, etc.
    // Runtime values come from daisyui-spatial via cascade; these are just the
    // alias mappings so Tailwind generates the utility classes.
    { name: "--spacing-space-xs", value: "var(--space-xs)", targets: BROWSER_ONLY },
    { name: "--spacing-space-sm", value: "var(--space-sm)", targets: BROWSER_ONLY },
    { name: "--spacing-space-md", value: "var(--space-md)", targets: BROWSER_ONLY },
    { name: "--spacing-space-lg", value: "var(--space-lg)", targets: BROWSER_ONLY },
    { name: "--spacing-space-xl", value: "var(--space-xl)", targets: BROWSER_ONLY },
    { name: "--spacing-container-x", value: "var(--container-padding-x)", targets: BROWSER_ONLY },
    { name: "--spacing-container-y", value: "var(--container-padding-y)", targets: BROWSER_ONLY },
    { name: "--spacing-section", value: "var(--section-gap)", targets: BROWSER_ONLY },
    { name: "--spacing-container", value: "var(--container-gap)", targets: BROWSER_ONLY },
  ],

  themeMaxWidth: [
    { name: "--max-width-page", value: "var(--content-width)", targets: BROWSER_ONLY },
  ],

  themeRadius: [
    { name: "--radius-box", value: "var(--radius-box)", targets: BOTH },
    { name: "--radius-field", value: "var(--radius-field)", targets: BOTH },
    { name: "--radius-selector", value: "var(--radius-selector)", targets: BOTH },
    { name: "--radius-full", value: "var(--radius-full, 9999px)", targets: BOTH },
    // Phase 0a: reconcile the radius scale formulas. theme.css used `calc(var(--radius) - 4px)`
    // formulas; browser used hardcoded literals (0.125rem, 0.375rem, etc.). The browser was
    // the deviant — aligning to theme.css = matches what ships to /view via SSR.
    { name: "--radius-sm", value: "calc(var(--radius) - 4px)", targets: BOTH },
    { name: "--radius-md", value: "calc(var(--radius) - 2px)", targets: BOTH },
    { name: "--radius-lg", value: "var(--radius)", targets: BOTH },
    { name: "--radius-xl", value: "calc(var(--radius) + 4px)", targets: BOTH },
    { name: "--radius-2xl", value: "calc(var(--radius) + 8px)", targets: BROWSER_ONLY },
    { name: "--radius-3xl", value: "calc(var(--radius) + 16px)", targets: BROWSER_ONLY },
  ],

  themeShadows: [
    { name: "--shadow-2xs", value: "var(--shadow-2xs)", targets: THEME_ONLY },
    { name: "--shadow-xs", value: "var(--shadow-xs)", targets: THEME_ONLY },
    { name: "--shadow-sm", value: "var(--shadow-sm)", targets: THEME_ONLY },
    { name: "--shadow", value: "var(--shadow)", targets: THEME_ONLY },
    { name: "--shadow-md", value: "var(--shadow-md)", targets: THEME_ONLY },
    { name: "--shadow-lg", value: "var(--shadow-lg)", targets: THEME_ONLY },
    { name: "--shadow-xl", value: "var(--shadow-xl)", targets: THEME_ONLY },
    { name: "--shadow-2xl", value: "var(--shadow-2xl)", targets: THEME_ONLY },
  ],

  themeAnimations: [
    // Browser only. Keyframes themselves live in `packages/sdk/src/css/styles.css` —
    // these are just the `--animate-*` shortcut tokens that Tailwind v4 needs to
    // generate `animate-css-fade-in` etc. utility classes.
    { name: "--animate-css-fade-in", value: "css-fade-in 0.6s ease-out both", targets: BROWSER_ONLY },
    { name: "--animate-css-fade-up", value: "css-fade-up 0.6s ease-out both", targets: BROWSER_ONLY },
    { name: "--animate-css-fade-down", value: "css-fade-down 0.6s ease-out both", targets: BROWSER_ONLY },
    { name: "--animate-css-fade-left", value: "css-fade-left 0.6s ease-out both", targets: BROWSER_ONLY },
    { name: "--animate-css-fade-right", value: "css-fade-right 0.6s ease-out both", targets: BROWSER_ONLY },
    { name: "--animate-css-scale-up", value: "css-scale-up 0.5s ease-out both", targets: BROWSER_ONLY },
    { name: "--animate-css-blur-in", value: "css-blur-in 0.7s ease-out both", targets: BROWSER_ONLY },
    { name: "--animate-css-slide-up", value: "css-slide-up 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both", targets: BROWSER_ONLY },
    { name: "--animate-css-flip-in", value: "css-flip-in 0.6s ease-out both", targets: BROWSER_ONLY },
    { name: "--animate-css-spring", value: "css-spring 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both", targets: BROWSER_ONLY },
    { name: "--animate-css-bounce-in", value: "css-bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both", targets: BROWSER_ONLY },
    { name: "--animate-css-thud-in", value: "css-thud-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both", targets: BROWSER_ONLY },
    { name: "--animate-css-tile-flip", value: "css-tile-flip 0.48s cubic-bezier(0.22, 1, 0.36, 1) both", targets: BROWSER_ONLY },
    { name: "--animate-css-spin", value: "css-spin 2s linear infinite", targets: BROWSER_ONLY },
    { name: "--animate-css-pulse", value: "css-pulse 2s ease-in-out infinite", targets: BROWSER_ONLY },
    { name: "--animate-css-wiggle", value: "css-wiggle 1s ease-in-out infinite", targets: BROWSER_ONLY },
    { name: "--animate-css-marquee", value: "css-marquee 40s linear infinite", targets: BROWSER_ONLY },
    { name: "--animate-css-marquee-slow", value: "css-marquee 60s linear infinite", targets: BROWSER_ONLY },
  ],
};
