/**
 * Resolve CSS custom properties to literal values for email output.
 *
 * Email clients drop `var()`. The compiled stylesheet defines its variables on
 * `:root` (Tailwind theme, the SDK default theme, spatial tokens) and the site
 * theme arrives as `overrides`, which must win: `compileCSS` prepends the site
 * `:root`, but the SDK default `:root` comes later in the output and would
 * otherwise override it.
 */

import postcss, { type Declaration, type Root } from "postcss";

const MAX_DEPTH = 10;

const isRootSelector = (selector: string): boolean =>
  selector
    .split(",")
    .map(s => s.trim())
    .every(s => s === ":root" || s === ":host");

/** `--name: value` pairs from a parsed sheet's top-level `:root` rules (later wins). */
function rootVarsOf(root: Root, into: Record<string, string> = {}): Record<string, string> {
  root.each(node => {
    if (node.type !== "rule" || !isRootSelector(node.selector)) return;
    node.each(d => {
      if (d.type === "decl" && d.prop.startsWith("--")) into[d.prop] = d.value.trim();
    });
  });
  return into;
}

/**
 * Parse `--name: value` pairs out of a stylesheet's top-level `:root` rules
 * (later declarations win). Used to turn the site theme CSS into overrides.
 */
export function collectRootVars(css: string): Record<string, string> {
  return rootVarsOf(postcss.parse(css));
}

/** Split `a, b, c` on top-level commas only. */
function splitFirstComma(s: string): [string, string | null] {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (s[i] === "," && depth === 0) return [s.slice(0, i), s.slice(i + 1)];
  }
  return [s, null];
}

/**
 * Replace every `var(--x)` / `var(--x, fallback)` in `value`. A variable that
 * is missing, cyclic, or nested deeper than `MAX_DEPTH` uses its fallback; with
 * no fallback the whole value is unresolvable and `null` is returned.
 */
export function resolveVarsInValue(
  value: string,
  vars: Record<string, string>,
  depth = 0,
  seen: ReadonlySet<string> = new Set()
): string | null {
  if (!value.includes("var(")) return value;
  if (depth > MAX_DEPTH) return null;
  const VAR_RE = /(?<![\w-])var\(/g;
  let out = "";
  let i = 0;
  for (let m = VAR_RE.exec(value); m; m = VAR_RE.exec(value)) {
    const at = m.index;
    out += value.slice(i, at);
    let d = 0;
    let end = -1;
    for (let j = at + 3; j < value.length; j++) {
      if (value[j] === "(") d++;
      else if (value[j] === ")" && --d === 0) {
        end = j;
        break;
      }
    }
    if (end < 0) return null;
    const [rawName, fallback] = splitFirstComma(value.slice(at + 4, end));
    const name = rawName.trim();
    let resolved: string | null = null;
    if (name in vars && !seen.has(name)) {
      resolved = resolveVarsInValue(vars[name], vars, depth + 1, new Set([...seen, name]));
    }
    if (resolved == null && fallback != null) {
      resolved = resolveVarsInValue(fallback.trim(), vars, depth + 1, seen);
    }
    if (resolved == null) return null;
    out += resolved;
    i = end + 1;
    VAR_RE.lastIndex = i;
  }
  return out + value.slice(i);
}

/** `@property` initial values, overlaid by top-level `:root` custom properties. */
function collectDefinitions(root: Root): Record<string, string> {
  const vars: Record<string, string> = {};
  root.walkAtRules("property", at => {
    at.each(d => {
      if (d.type === "decl" && d.prop === "initial-value") vars[at.params.trim()] = d.value.trim();
    });
  });
  return rootVarsOf(root, vars);
}

/**
 * Inline every custom property in `css`.
 *
 * 1. collect `--name: value` from top-level `:root` / `:host` rules (and
 *    `@property` initial values, which are what an unset registered property
 *    computes to);
 * 2. apply `overrides` on top — the site theme vars;
 * 3. replace `var()` recursively in every other declaration, dropping any
 *    declaration that can't resolve;
 * 4. remove the `:root` rules, `@property` rules and every `--*` declaration.
 */
export function resolveCssVars(css: string, overrides: Record<string, string>): string {
  const root = postcss.parse(css);
  const vars = { ...collectDefinitions(root), ...overrides };

  root.walkAtRules("property", at => {
    at.remove();
  });
  root.each(node => {
    if (node.type === "rule" && isRootSelector(node.selector)) node.remove();
  });
  root.walkDecls((decl: Declaration) => {
    if (decl.prop.startsWith("--")) {
      decl.remove();
      return;
    }
    const resolved = resolveVarsInValue(decl.value, vars);
    if (resolved == null) decl.remove();
    else decl.value = resolved;
  });
  root.walkRules(rule => {
    if (!rule.nodes?.length) rule.remove();
  });
  return root.toString();
}
