/**
 * Pure Tailwind export — replaces DaisyUI component classes and spatial tokens
 * with standard Tailwind utility equivalents.
 *
 * Used by code previews (block library), static HTML export, and framework
 * exports (React/Next/Vue/Nuxt) so output is copy-paste ready without DaisyUI
 * or the spatial token package.
 */

// ── DaisyUI component class → Tailwind utilities ─────────────────────────

const DAISYUI_MAP: Record<string, string> = {
  // Button
  btn: "inline-flex items-center justify-center font-semibold rounded-lg transition-colors cursor-pointer",
  "btn-primary": "bg-primary text-primary-content hover:bg-primary/80",
  "btn-secondary": "bg-secondary text-secondary-content hover:bg-secondary/80",
  "btn-accent": "bg-accent text-accent-content hover:bg-accent/80",
  "btn-neutral": "bg-neutral text-neutral-content hover:bg-neutral/80",
  "btn-ghost": "bg-transparent hover:bg-base-200",
  "btn-outline":
    "border border-current bg-transparent hover:bg-primary hover:text-primary-content hover:border-primary",
  "btn-link": "bg-transparent underline hover:no-underline p-0 h-auto min-h-0",
  "btn-xs": "h-6 px-2 text-xs",
  "btn-sm": "h-8 px-3 text-sm",
  "btn-md": "h-10 px-4 text-sm",
  "btn-lg": "h-12 px-6 text-lg",
  "btn-xl": "h-14 px-8 text-lg",
  "btn-wide": "w-64",
  "btn-block": "w-full",
  "btn-circle": "rounded-full h-12 w-12 p-0",
  "btn-square": "h-12 w-12 p-0",
  "btn-soft": "bg-primary/15 text-primary hover:bg-primary/25",
  "btn-dash": "border border-dashed border-current bg-transparent",

  // Card
  card: "rounded-2xl overflow-hidden bg-base-100",
  "card-body": "p-6 flex flex-col gap-3",
  "card-title": "text-lg font-semibold",
  "card-actions": "flex items-center gap-2",
  "card-bordered": "border border-base-300",
  "card-compact": "[&_.card-body]:p-4 [&_.card-body]:gap-2",
  "card-side": "flex-row",

  // Badge
  badge: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  "badge-primary": "bg-primary text-primary-content",
  "badge-secondary": "bg-secondary text-secondary-content",
  "badge-accent": "bg-accent text-accent-content",
  "badge-neutral": "bg-neutral text-neutral-content",
  "badge-ghost": "bg-base-200 text-base-content",
  "badge-outline": "border border-current bg-transparent",
  "badge-sm": "px-1.5 py-0 text-[10px]",
  "badge-lg": "px-3 py-1 text-sm",

  // Hero
  hero: "flex items-center justify-center w-full",
  "hero-content": "flex flex-col items-center gap-4 p-4 max-w-7xl relative z-10",
  "hero-overlay": "absolute inset-0",

  // Navbar
  navbar: "flex items-center w-full min-h-16 px-4",
  "navbar-start": "flex items-center flex-none",
  "navbar-center": "flex items-center flex-auto justify-center",
  "navbar-end": "flex items-center flex-none",

  // Footer
  footer: "grid auto-cols-auto grid-flow-col gap-8 text-sm",
  "footer-title": "font-bold uppercase tracking-wide text-xs opacity-60 mb-2",

  // Divider
  divider:
    "flex items-center gap-2 before:flex-1 before:border-t before:border-base-300 after:flex-1 after:border-t after:border-base-300",
  "divider-horizontal":
    "flex-col before:border-l before:border-t-0 after:border-l after:border-t-0",

  // Join (input groups)
  join: "inline-flex [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none",
  "join-item": "",
  "join-vertical":
    "flex-col [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none",

  // Stats
  stats:
    "inline-grid grid-flow-col divide-x divide-base-300 rounded-2xl overflow-hidden bg-base-100",
  stat: "flex flex-col gap-0.5 px-6 py-4",
  "stat-title": "text-sm opacity-60",
  "stat-value": "text-2xl font-bold",
  "stat-desc": "text-xs opacity-60",
  "stat-figure": "flex items-center",

  // Link
  link: "underline cursor-pointer",
  "link-hover": "no-underline hover:underline",
  "link-primary": "text-primary",
  "link-secondary": "text-secondary",
  "link-accent": "text-accent",
  "link-neutral": "text-neutral",

  // Alert
  alert: "flex items-start gap-3 rounded-lg p-4",
  "alert-info": "bg-info/15 text-info",
  "alert-success": "bg-success/15 text-success",
  "alert-warning": "bg-warning/15 text-warning",
  "alert-error": "bg-error/15 text-error",

  // Input (DaisyUI component, not Tailwind utility)
  "input-bordered": "border border-base-300",
  "input-primary": "border-primary focus:border-primary",
  "input-ghost": "bg-transparent border-transparent",

  // Menu
  menu: "flex flex-col gap-0.5 p-2",
  "menu-horizontal": "flex-row",

  // Modal
  modal: "fixed inset-0 flex items-center justify-center",
  "modal-box": "bg-base-100 rounded-2xl p-6 shadow-xl max-w-lg w-full",
  "modal-backdrop": "fixed inset-0 bg-black/50",
  "modal-action": "flex justify-end gap-2 mt-4",

  // Tabs
  tabs: "flex",
  "tabs-bordered": "border-b border-base-300",
  tab: "px-4 py-2 font-medium cursor-pointer",
  "tab-active": "border-b-2 border-primary text-primary",

  // Toggle / Checkbox / Radio (strip — these are complex CSS)
  toggle: "appearance-none w-12 h-6 rounded-full bg-base-300 cursor-pointer relative",
  checkbox: "appearance-none w-5 h-5 rounded border border-base-300 cursor-pointer",
  radio: "appearance-none w-5 h-5 rounded-full border border-base-300 cursor-pointer",

  // Textarea / Select (DaisyUI adds base styling)
  textarea: "w-full rounded-lg border border-base-300 p-3",
  select: "w-full rounded-lg border border-base-300 px-3 py-2 appearance-none",

  // Collapse
  collapse: "rounded-lg overflow-hidden",
  "collapse-title": "font-medium cursor-pointer px-4 py-3",
  "collapse-content": "px-4 pb-3",
  "collapse-arrow": "",

  // Dropdown
  dropdown: "relative inline-block",
  "dropdown-content": "absolute z-50 mt-1 rounded-lg bg-base-100 shadow-lg p-2",

  // Tooltip
  tooltip: "relative",

  // Skeleton
  skeleton: "animate-pulse bg-base-300 rounded",

  // Table
  table: "w-full text-left",

  // Misc — strip (no meaningful Tailwind equivalent or purely decorative)
  "no-animation": "",
  loading: "",
  "loading-spinner": "",
  "loading-dots": "",
  "loading-ring": "",
  "loading-ball": "",
  "loading-bars": "",
  "loading-infinity": "",
  glass: "backdrop-blur-md bg-white/10",
  mask: "",
  "mask-squircle": "rounded-2xl",
  swap: "",
  "swap-on": "",
  "swap-off": "",
  indicator: "relative inline-flex",
  "indicator-item": "absolute top-0 right-0",
  kbd: "px-2 py-0.5 rounded border border-base-300 bg-base-200 font-mono text-sm",
  dock: "fixed bottom-0 left-0 right-0 flex items-center justify-around p-2 bg-base-100",
};

// ── Spatial token → Tailwind arbitrary/standard value ─────────────────────

const SPATIAL_SUFFIX_MAP: Record<string, string> = {
  "space-3xs": "[clamp(0.125rem,0.0625rem+0.19vw,0.25rem)]",
  "space-2xs": "[clamp(0.25rem,0.125rem+0.39vw,0.375rem)]",
  "space-xs": "[clamp(0.375rem,0.25rem+0.39vw,0.5rem)]",
  "space-sm": "[clamp(0.75rem,0.5rem+0.75vw,1rem)]",
  "space-md": "[clamp(1.5rem,1rem+1.5vw,2rem)]",
  "space-lg": "[clamp(2.5rem,1.25rem+3.75vw,4rem)]",
  "space-xl": "[clamp(3.5rem,1.75rem+5.25vw,6rem)]",
  "container-x": "8",
  "container-y": "8",
  section: "16",
  container: "6",
};

// Tailwind utility prefixes that can take spatial tokens
const SPATIAL_PREFIXES = [
  "gap",
  "gap-x",
  "gap-y",
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "ps",
  "pe",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "ms",
  "me",
  "w",
  "min-w",
  "max-w",
  "h",
  "min-h",
  "max-h",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "inset-x",
  "inset-y",
  "basis",
  "scroll-m",
  "scroll-p",
];

// ── Radius token → standard Tailwind ──────────────────────────────────────

const RADIUS_MAP: Record<string, string> = {
  "rounded-box": "rounded-2xl",
  "rounded-field": "rounded-md",
  "rounded-selector": "rounded-lg",
};

// ── Layout token → Tailwind ───────────────────────────────────────────────

const LAYOUT_MAP: Record<string, string> = {
  "max-w-page": "max-w-7xl",
  "cta-responsive": "w-full sm:w-auto",
  "cta-outline-responsive": "w-full sm:w-auto",
};

// ── Main transform ────────────────────────────────────────────────────────

/**
 * Replace DaisyUI component classes, spatial tokens, and custom radius/layout
 * tokens with standard Tailwind utility equivalents.
 *
 * Pure function — no side effects, no DOM, works in Node and browser.
 */
export function purifyToTailwind(className: string): string {
  if (!className) return className;

  const seen = new Set<string>();
  const result: string[] = [];

  for (const token of className.split(/\s+/)) {
    if (!token) continue;

    // Strip responsive/variant prefix for lookup, but preserve it for output
    const colonIdx = token.lastIndexOf(":");
    const prefix = colonIdx >= 0 ? token.slice(0, colonIdx + 1) : "";
    const base = colonIdx >= 0 ? token.slice(colonIdx + 1) : token;

    // 1. Check DaisyUI component class
    if (base in DAISYUI_MAP) {
      const expanded = DAISYUI_MAP[base];
      if (expanded) {
        for (const cls of expanded.split(/\s+/)) {
          const full = prefix + cls;
          if (!seen.has(full)) {
            seen.add(full);
            result.push(full);
          }
        }
      }
      continue;
    }

    // 2. Check radius tokens
    if (base in RADIUS_MAP) {
      const replacement = prefix + RADIUS_MAP[base];
      if (!seen.has(replacement)) {
        seen.add(replacement);
        result.push(replacement);
      }
      continue;
    }

    // 3. Check layout tokens
    if (base in LAYOUT_MAP) {
      const expanded = LAYOUT_MAP[base];
      if (expanded) {
        for (const cls of expanded.split(/\s+/)) {
          const full = prefix + cls;
          if (!seen.has(full)) {
            seen.add(full);
            result.push(full);
          }
        }
      }
      continue;
    }

    // 4. Check spatial tokens (prefix-suffix pattern like gap-space-sm, px-space-md)
    let wasSpatial = false;
    for (const sp of SPATIAL_PREFIXES) {
      if (base.startsWith(sp + "-")) {
        const suffix = base.slice(sp.length + 1);
        if (suffix in SPATIAL_SUFFIX_MAP) {
          const replacement = prefix + sp + "-" + SPATIAL_SUFFIX_MAP[suffix];
          if (!seen.has(replacement)) {
            seen.add(replacement);
            result.push(replacement);
          }
          wasSpatial = true;
          break;
        }
      }
    }
    if (wasSpatial) continue;

    // 5. Pass through (standard Tailwind utility)
    if (!seen.has(token)) {
      seen.add(token);
      result.push(token);
    }
  }

  return result.join(" ");
}
