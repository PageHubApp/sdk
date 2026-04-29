/**
 * Responsive design lint — flags className patterns likely to break on mobile.
 *
 * Pure functions, no React. Per-row consumers in the layers panel call
 * `lintNode(node, parent?)` inside a `useMemo` keyed on the node's className.
 *
 * Starter rule set (high signal, low false-positive):
 *   1. `w-[Npx]` / `min-w-[Npx]` with N ≥ 640 and no responsive override (error)
 *   2. `text-5xl|6xl|7xl|8xl|9xl` at base — that IS the mobile size in mobile-first Tailwind (warn)
 *   3. `grid-cols-N` (N ≥ 2) at base with no responsive variant — collapses awkwardly on phones (warn)
 *   4. Negative margin (`-m*-`) at base with no breakpoint scope — pulls content offscreen on mobile (warn)
 */

export type LintSeverity = "warn" | "error";

export interface LintFix {
  remove?: string[];
  add?: string[];
}

export interface LintIssue {
  rule: string;
  severity: LintSeverity;
  title: string;
  message: string;
  tip?: string;
  fix?: LintFix;
}

const RESPONSIVE_PREFIX = /^(?:sm|md|lg|xl|2xl|max-sm|max-md|max-lg|max-xl):/;

function splitClasses(cls: string): string[] {
  return cls.split(/\s+/).filter(Boolean);
}

/** Tokens with no responsive prefix — these apply at every breakpoint, including mobile. */
function baseTokens(cls: string): string[] {
  return splitClasses(cls).filter(t => !RESPONSIVE_PREFIX.test(t));
}

/** Whether any token in the className matches a regex (across all breakpoints). */
function anyToken(cls: string, re: RegExp): boolean {
  return splitClasses(cls).some(t => re.test(t));
}

// ─── Rules ────────────────────────────────────────────────────────────────

function ruleFixedWidthOverflowsMobile(cls: string): LintIssue | null {
  const base = baseTokens(cls);
  const offender = base.find(t => {
    const m = t.match(/^(?:w|min-w|max-w)-\[(\d+)px\]$/);
    if (!m) return false;
    return parseInt(m[1], 10) >= 640;
  });
  if (!offender) return null;

  // Allow when an explicit responsive width is also present — the author is doing
  // intentional desktop-first layout (rare but possible).
  if (anyToken(cls, /^(?:sm|md|lg|xl|2xl):(?:w|min-w|max-w)-/)) return null;

  return {
    rule: "fixed-width-overflows-mobile",
    severity: "error",
    title: "Too wide for mobile",
    message: `This element is likely wider than most phone screens.`,
    tip: `Add max-w-full to let it shrink on small screens.`,
    fix: { add: ["max-w-full"] },
  };
}

const HEADING_MOBILE_DOWNSCALE: Record<string, string> = {
  "text-9xl": "text-4xl",
  "text-8xl": "text-4xl",
  "text-7xl": "text-3xl",
  "text-6xl": "text-3xl",
  "text-5xl": "text-2xl",
};

function ruleHugeHeadingOnMobile(cls: string): LintIssue | null {
  const base = baseTokens(cls);
  const LARGE = ["text-5xl", "text-6xl", "text-7xl", "text-8xl", "text-9xl"];
  const offender = base.find(t => LARGE.includes(t));
  if (!offender) return null;

  const mobileSize = HEADING_MOBILE_DOWNSCALE[offender] ?? "text-2xl";

  return {
    rule: "huge-heading-on-mobile",
    severity: "warn",
    title: "Heading may be too large on mobile",
    message: `This heading could be oversized on small screens.`,
    tip: `Apply ${offender} at md: and use ${mobileSize} as the mobile base.`,
    fix: { remove: [offender], add: [mobileSize, `md:${offender}`] },
  };
}

function ruleGridColsNoMobileFallback(cls: string, node: any): LintIssue | null {
  const base = baseTokens(cls);
  const cols = base.find(t => /^grid-cols-\d+$/.test(t));
  if (!cols) return null;
  const n = parseInt(cols.replace("grid-cols-", ""), 10);
  if (n < 2) return null;

  // Skip when the container has only 1 child — single-column grid is intentional.
  const childCount = node?.data?.nodes?.length ?? 0;
  if (childCount <= 1) return null;

  // Skip when the user has set grid-cols-* at any responsive breakpoint — they
  // know what they're doing.
  if (anyToken(cls, /^(?:sm|md|lg|xl|2xl):grid-cols-/)) return null;

  return {
    rule: "grid-cols-no-mobile-fallback",
    severity: "warn",
    title: "Grid may be too wide on mobile",
    message: `This grid layout may be cramped or overflow on small screens.`,
    tip: `Stack to a single column on mobile with grid-cols-1 md:${cols}.`,
    fix: { remove: [cols], add: ["grid-cols-1", `md:${cols}`] },
  };
}

function ruleNegativeMarginNoScope(cls: string): LintIssue | null {
  const base = baseTokens(cls);
  // -m-, -mx-, -my-, -mt-, -mr-, -mb-, -ml-, -ms-, -me- followed by digits or [...]
  const NEG = /^-m[xytrbslme]?-(?:\d+(?:\.\d+)?|\[[^\]]+\])$/;
  const offender = base.find(t => NEG.test(t));
  if (!offender) return null;

  // Skip when the user is also setting any margin at a responsive breakpoint —
  // they're aware of breakpoint behavior.
  if (anyToken(cls, /^(?:sm|md|lg|xl|2xl):-?m[xytrbslme]?-/)) return null;

  return {
    rule: "negative-margin-no-scope",
    severity: "warn",
    title: "Negative margin on mobile",
    message: `This negative margin may push content offscreen on small screens.`,
    tip: `Review how it looks on mobile — scope with md: if it's desktop-only.`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

const RULES: Array<(cls: string, node: any, parent: any) => LintIssue | null> = [
  ruleFixedWidthOverflowsMobile,
  ruleHugeHeadingOnMobile,
  ruleGridColsNoMobileFallback,
  ruleNegativeMarginNoScope,
];

/**
 * Lint a single node's className against responsive rules.
 * Pure — call inside useMemo keyed on the className strings.
 */
export function lintNode(node: any, parent?: any): LintIssue[] {
  const cls: string = node?.data?.props?.className || "";
  if (!cls) return [];

  // Author opt-out: `node.data.custom.lintIgnore = true` or array of rule names.
  const ignore = node?.data?.custom?.lintIgnore;
  if (ignore === true) return [];
  const ignoreRules: string[] = Array.isArray(ignore) ? ignore : [];

  const issues: LintIssue[] = [];
  for (const rule of RULES) {
    const issue = rule(cls, node, parent);
    if (issue && !ignoreRules.includes(issue.rule)) issues.push(issue);
  }
  return issues;
}

/** Maximum severity present in an issues list, or null when empty. */
export function maxSeverity(issues: LintIssue[]): LintSeverity | null {
  if (issues.some(i => i.severity === "error")) return "error";
  if (issues.length > 0) return "warn";
  return null;
}
