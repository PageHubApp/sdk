/**
 * EMAIL_PROFILE — the one description of what an email can contain.
 *
 * Two consumers read it: `emailEditorConfig()` narrows the editor so authors
 * can only build what the renderer can emit, and `validateEmailTree()` rejects
 * anything else at save / render time. See docs/sdk/email-export.md.
 *
 * Editor-side module: no server dependencies. Safe to export from the main entry.
 */

import { registerCatalogFilter } from "../../define/catalogRegistry";
import { registerComponentAllowlist } from "../../define/componentAllowlist";
import type { PageHubFeatures } from "../../types/features";
import { presetIsEmailSafe } from "./presetSafety";

/** Width of the email canvas in px. Every static length resolves against it. */
export const EMAIL_WIDTH = 600;

/** Viewport width at and below which columns stack. */
export const EMAIL_STACK_BREAKPOINT = 620;

/**
 * Components an email tree may contain. There is no Divider component; the
 * "Divider" preset is a Container with `border-t w-full`.
 */
export const EMAIL_COMPONENTS = ["Container", "Text", "Button", "Image"] as const;

/** Responsive prefixes the email pipeline recognizes (one, stripped before matching). */
export const EMAIL_RESPONSIVE_PREFIX_RE = /^(sm|md|lg):/;

/** Base-class tokens (after stripping one `sm:|md:|lg:` prefix) the email pipeline supports. */
export const EMAIL_CLASS_ALLOWLIST: RegExp[] = [
  /^(bg|text|border(-[trbl])?)-(primary|secondary|accent|neutral|info|success|warning|error|base-(100|200|300)|base-content|(primary|secondary|accent|neutral|info|success|warning|error)-content)(\/\d{1,3})?$/,
  /^text-(xs|sm|base|lg|xl|[2-6]xl|left|center|right)$/,
  /^font-(normal|medium|semibold|bold|extrabold|heading|body)$/,
  /^(leading|tracking)-[a-z0-9\[\]\.]+$/,
  /^-?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mb|gap)-[a-z0-9\[\]\.-]+$/,
  /^(w|max-w)-(full|\d+|\[\d+px\])$/,
  /^(rounded|rounded-[a-z0-9\[\]]+)$/,
  /^(border|border-[trbl]|border-[0-8])$/,
  /^(flex|flex-row|flex-col|grid|grid-cols-[1-4]|items-(start|center|end)|justify-(start|center|end|between)|text-(left|center|right))$/,
  /^(uppercase|lowercase|capitalize|italic|underline|no-underline)$/,
  /^(hidden|block)$/,
];

/**
 * Classes that make a tree un-sendable (error, not warning). DaisyUI component
 * classes compile to internal var chains and `:is()` selectors, so buttons in
 * email are styled with `bg-` / `text-` / `px-` / `py-` / `rounded-` utilities.
 */
export const EMAIL_UNSAFE =
  /(^|:)(btn|card|badge|navbar|hero|menu|tab|modal|input)(-|$)|backdrop-blur|animate-|transform|transition|filter|fixed|sticky|absolute|shadow|bg-linear|bg-gradient|overflow-/;

export const EMAIL_INSPECTOR_TABS: PageHubFeatures["inspectorTabs"] = {
  Container: ["component", "layout", "design"],
  Text: ["component", "design"],
  Button: ["component", "design"],
  Image: ["component", "design"],
};

/** Strip one `sm:|md:|lg:` prefix from a class token. */
export function stripEmailPrefix(token: string): string {
  return token.replace(EMAIL_RESPONSIVE_PREFIX_RE, "");
}

/** True when a class token (one responsive prefix allowed) matches the allowlist. */
export function isEmailClassAllowed(token: string): boolean {
  const base = stripEmailPrefix(token);
  return EMAIL_CLASS_ALLOWLIST.some(re => re.test(base));
}

/**
 * `EMAIL_CLASS_ALLOWLIST` in the shape the editor's `cssAllowlist` filter wants:
 * it tests raw tokens, so each pattern also accepts one responsive prefix.
 */
const EDITOR_CLASS_ALLOWLIST: RegExp[] = EMAIL_CLASS_ALLOWLIST.map(
  re => new RegExp(`^(?:(?:sm|md|lg):)?(?:${re.source.replace(/^\^|\$$/g, "")})$`)
);

/** Class tokens of a node (`className` + typography `helpers`), as the static walker reads them. */
export function nodeClassTokens(props: Record<string, any> | undefined): string[] {
  const cn = props?.className;
  const raw = typeof cn === "string" ? cn : Array.isArray(cn) ? cn.join(" ") : "";
  return [raw, typeof props?.helpers === "string" ? props.helpers : ""]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Layout tokens a Container's emitter turns into table structure. Responsive
 * variants of these are honored as the desktop value; mobile always stacks.
 */
const LAYOUT_TOKEN_RE =
  /^(flex|flex-row|flex-col|grid|grid-cols-\d+|items-(start|center|end)|justify-(start|center|end|between)|gap(-[xy])?-.+)$/;

/** True for a layout token (prefix stripped) that the Container emitter consumes. */
export function isEmailLayoutToken(token: string): boolean {
  return LAYOUT_TOKEN_RE.test(stripEmailPrefix(token));
}

export interface EmailLayout {
  /** Column count, or 0 when children stack. */
  columns: number;
  valign: "top" | "middle" | "bottom";
  /** Center children horizontally (`align="center"` on their cells). */
  center: boolean;
  /**
   * Gap class tokens (`gap-space-sm`, `gap-x-4`), unprefixed first so desktop
   * variants apply last. Resolved to px after the CSS compile.
   */
  gapTokens: string[];
}

/**
 * Read a Container's layout from its class tokens at the email's desktop width:
 * a prefixed token (`md:flex-row`) overrides its unprefixed counterpart, so the
 * mobile-first `flex-col md:flex-row` is two columns that stack on phones.
 */
export function readEmailLayout(tokens: string[], childCount: number): EmailLayout {
  const base: string[] = [];
  const desktop: string[] = [];
  for (const t of tokens) {
    if (EMAIL_RESPONSIVE_PREFIX_RE.test(t)) desktop.push(stripEmailPrefix(t));
    else base.push(t);
  }
  const pick = (re: RegExp): string | undefined =>
    [...desktop].reverse().find(t => re.test(t)) ?? [...base].reverse().find(t => re.test(t));

  const direction = pick(/^flex-(row|col)$/);
  const cols = pick(/^grid-cols-\d+$/);
  const isGrid = !!pick(/^grid$/);
  let columns = 0;
  if (direction === "flex-row") columns = childCount;
  else if (isGrid && cols) {
    const n = parseInt(cols.slice("grid-cols-".length), 10);
    if (n > 1) columns = n;
  }
  const items = pick(/^items-(start|center|end)$/);
  return {
    columns,
    valign: items === "items-center" ? "middle" : items === "items-end" ? "bottom" : "top",
    // Horizontal centering: the main axis for columns, the cross axis when stacked.
    center: columns > 0 ? pick(/^justify-/) === "justify-center" : items === "items-center",
    gapTokens: [...base, ...desktop].filter(t => /^gap(-[xy])?-/.test(t)),
  };
}

/** True when a class string carries any `EMAIL_UNSAFE` token. */
export function hasUnsafeEmailClass(classes: string): boolean {
  return classes.split(/\s+/).some(t => t && EMAIL_UNSAFE.test(t));
}

/**
 * Boot helper. Call BEFORE mounting the editor (registries are boot-time only —
 * host-constraints.md "Ordering rule"). Returns the `features` to pass.
 *
 * `extraComponents` must list any host email-only components (e.g. `EmailSlot`):
 * the allowlist filters defs before the resolver is built, so an unlisted
 * component can't be deserialized.
 */
export function emailEditorConfig(extraComponents: string[] = []): Partial<PageHubFeatures> {
  const allowed = new Set<string>([...EMAIL_COMPONENTS, ...extraComponents]);
  registerComponentAllowlist([...allowed]);
  for (const name of EMAIL_COMPONENTS) {
    registerCatalogFilter(name, (entry, kind) => {
      const e = entry as {
        classes?: string;
        expands?: string;
        name?: string;
        props?: { className?: string };
        children?: unknown;
      };
      // A single-class modifier carries its class as `name` and has no `classes`.
      const modifierClass = kind === "modifier" && !e.classes ? (e.name ?? "") : "";
      if (
        hasUnsafeEmailClass(
          `${e.classes ?? ""} ${e.expands ?? ""} ${e.props?.className ?? ""} ${modifierClass}`
        )
      ) {
        return false;
      }
      return kind !== "preset" || presetIsEmailSafe(e, allowed, hasUnsafeEmailClass);
    });
  }
  return {
    sidebar: true,
    toolbar: true,
    aiGeneration: false,
    customCSS: false,
    importExport: false,
    seoPanel: false,
    multiPage: false,
    custom404Page: false,
    darkModeSwitcher: false,
    // The theme comes from the host (a site's live theme), so the Theme panel
    // would edit something that isn't saved; publishing is the host's call too.
    designSystem: false,
    saveButton: false,
    // The Media Manager browses the site's library; the email doc's copy of it
    // is stripped on save, so library edits here would silently not stick.
    mediaLibraryEdit: false,
    blocksPanel: { enabled: false },
    inspectorTabs: EMAIL_INSPECTOR_TABS,
    cssAllowlist: { classes: EDITOR_CLASS_ALLOWLIST },
    canvasWidth: EMAIL_WIDTH,
  };
}
