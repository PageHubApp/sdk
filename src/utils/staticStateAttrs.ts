/**
 * State-system data attributes for static HTML rendering (`data-state-*`,
 * `data-visibility-state-key`, `data-publish-state-keys`) — the SSR half of
 * the static runtime's state chunk. Re-exported from ./staticHtml, which is
 * the import path components use. No React, no DOM — pure functions only.
 */

import { twMerge } from "tailwind-merge";
import { BUILTIN_STATE_MODIFIERS } from "./conditions/stateBuiltinModifiers";
import type { ComponentModifier } from "../define/types";
import type { StaticRenderContext } from "./staticHtml";

/** Emit `data-state-binding` for `<FormElement>`-style state-binding props. */
export function stateBindingAttrs(props: Record<string, any>): Record<string, string | undefined> {
  const b = props.stateBinding;
  if (!b || typeof b !== "object" || !b.key) return {};
  return { "data-state-binding": JSON.stringify(b) };
}

/**
 * Resolve a modifier name to its class list. Mirrors
 * `applyStateModifiers` — reads the viewer-safe builtin registry and any
 * site-saved overrides on `ROOT.props.modifiers[<componentName>]`.
 */
function resolveModifierClasses(
  componentName: string,
  modifierName: string,
  rootProps: any
): string {
  const builtin = BUILTIN_STATE_MODIFIERS[componentName] ?? [];
  const siteSaved =
    (rootProps?.modifiers?.[componentName] as ComponentModifier[] | undefined) ?? [];
  const available = builtin.concat(siteSaved);
  const mod = available.find(m => m.name === modifierName);
  if (!mod) return "";
  if (mod.classes) return mod.classes;
  return mod.name;
}

/**
 * Emit `data-state-modifiers` for state-driven className modifier rules.
 *
 * The runtime is state-table-free: we resolve modifier *names* to Tailwind
 * class strings here at SSR, so the emitted payload is
 * `[{ conditions, classes: "<class string>" }, ...]`. The runtime just
 * toggles the resolved class string when the binding's conditions pass.
 *
 * Resolves against the same `BUILTIN_STATE_MODIFIERS` registry the React
 * path uses, plus any site-saved overrides on
 * `ROOT.props.modifiers[<componentName>]`. The component name comes from
 * `ctx.renderingNodeId` (set by the walker).
 */
export function stateModifiersAttrs(
  props: Record<string, any>,
  ctx?: StaticRenderContext
): Record<string, string | undefined> {
  const m = props.stateModifiers;
  if (!Array.isArray(m) || m.length === 0) return {};
  // Without ctx we can't resolve names → classes; emit the raw JSON shape
  // as a degraded fallback (component-side callers always thread ctx through).
  if (!ctx) return { "data-state-modifiers": JSON.stringify(m) };

  const node = ctx.renderingNodeId ? ctx.nodes?.[ctx.renderingNodeId] : null;
  const componentName =
    (node && (typeof node.type === "string" ? node.type : node.type?.resolvedName)) || "Container";
  const rootProps = ctx.nodes?.["ROOT"]?.props || {};

  const resolved = m.map((binding: any) => {
    const classes = Array.isArray(binding?.modifiers)
      ? binding.modifiers
          .map((name: string) => resolveModifierClasses(componentName, name, rootProps))
          .filter(Boolean)
          .join(" ")
      : "";
    // Base classes this binding overrides (same twMerge resolution the React
    // path applies). The runtime removes them while the binding passes, so
    // e.g. an active tab's `border-primary` isn't beaten by `border-transparent`.
    const base = typeof props.className === "string" ? props.className : "";
    const kept = new Set(twMerge(base, classes).split(/\s+/));
    const remove = classes ? base.split(/\s+/).filter(c => c && !kept.has(c)) : [];
    return remove.length
      ? { conditions: binding?.conditions || [], classes, remove: remove.join(" ") }
      : { conditions: binding?.conditions || [], classes };
  });
  // Filter bindings with no resolved classes (unknown modifier names) so the
  // runtime doesn't iterate dead bindings.
  const filtered = resolved.filter(b => b.classes);
  if (!filtered.length) return {};
  return { "data-state-modifiers": JSON.stringify(filtered) };
}

/** Emit `data-state-style-bindings` for state-driven inline style bindings. */
export function stateStyleBindingsAttrs(
  props: Record<string, any>
): Record<string, string | undefined> {
  const m = props.stateStyleBindings;
  if (!Array.isArray(m) || m.length === 0) return {};
  return { "data-state-style-bindings": JSON.stringify(m) };
}

/** Emit `data-computed-state-bindings` for compute-on-mount state writes. */
export function computedStateBindingsAttrs(
  props: Record<string, any>
): Record<string, string | undefined> {
  const m = props.computedStateBindings;
  if (!Array.isArray(m) || m.length === 0) return {};
  return { "data-computed-state-bindings": JSON.stringify(m) };
}

/** Emit `data-visibility-state-key` so the runtime can toggle the node. */
export function visibilityStateKeyAttr(
  props: Record<string, any>
): Record<string, string | undefined> {
  const k = props.visibilityStateKey;
  if (typeof k !== "string" || !k) return {};
  return { "data-visibility-state-key": k };
}

/** Emit `data-publish-state-keys` so connector-backed nodes can publish meta. */
export function publishStateKeysAttr(
  props: Record<string, any>
): Record<string, string | undefined> {
  const k = props.dataSource?.publishStateKeys;
  if (!k || typeof k !== "object") return {};
  return { "data-publish-state-keys": JSON.stringify(k) };
}

const STATE_TOKEN_RE = /\{\{\s*state\.([^}\s]+)\s*\}\}/g;

/**
 * `{{state.<key>}}` can't resolve at SSR (state lives in the browser), and
 * `interpolate` leaves an unresolved token verbatim. Blank the tokens in the
 * markup and ship the HTML as `data-state-template`, which the runtime's
 * `state-template` directive re-renders on every state change.
 */
export function liveStateText(html: string): {
  html: string;
  attrs: Record<string, string | undefined>;
} {
  if (!html.includes("{{") || !html.match(STATE_TOKEN_RE)) return { html, attrs: {} };
  return { html: html.replace(STATE_TOKEN_RE, ""), attrs: { "data-state-template": html } };
}

/** All state-related data-attrs in one spread. */
export function stateAttrs(
  props: Record<string, any>,
  ctx?: StaticRenderContext
): Record<string, string | undefined> {
  return {
    ...stateBindingAttrs(props),
    ...stateModifiersAttrs(props, ctx),
    ...stateStyleBindingsAttrs(props),
    ...computedStateBindingsAttrs(props),
    ...visibilityStateKeyAttr(props),
    ...publishStateKeysAttr(props),
  };
}
