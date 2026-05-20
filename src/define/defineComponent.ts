import type { ToHTMLFn } from "../utils/staticHtml";
import { buildFallbackToHTML, humanize, normalizeRules } from "./helpers";
import {
  COMPONENT_DEF_BRAND,
  type PageHubComponentDef,
  type PropSchema,
  type ResolvedComponentDef,
} from "./types";
import { validate } from "./validation";

/**
 * Define a component for the PageHub editor.
 *
 * Returns a frozen descriptor that can be passed to `PageHub.init()`,
 * `<PageHubEditor>`, `<PageHubViewer>`, or `renderToHTML()` via the
 * `components` array.
 *
 * For built-in SDK components, pass `{ __internal: true }` as the second
 * argument to skip the built-in name collision check.
 */
export function defineComponent<P extends Record<string, any> = Record<string, any>>(
  def: PageHubComponentDef<P>,
  opts?: { __internal?: boolean }
): ResolvedComponentDef<P> {
  validate(def, !!opts?.__internal);

  const canvas = def.canvas ?? false;

  // `def.toHTML` is `ToHTMLFn<P>` (narrowed for the host author); the
  // resolved descriptor stores the wider `ToHTMLFn` so downstream consumers
  // (static walker, viewer-resolver processors) can call it uniformly with
  // `Record<string, any>` node props. The cast is type-only — the function
  // body never reads the narrowed shape from the resolved record.
  // Same story for `defaultProps` / `props`.
  const resolved: ResolvedComponentDef<P> = {
    [COMPONENT_DEF_BRAND]: true,
    name: def.name,
    displayName: def.displayName || humanize(def.name),
    description: def.description,
    component: def.component,
    toHTML: (def.toHTML as ToHTMLFn | undefined) || buildFallbackToHTML(canvas),
    icon: def.icon,
    category: def.category || "Custom",
    canvas,
    settings: def.settings,
    advancedSettings: def.advancedSettings,
    props: def.props as Record<string, PropSchema> | undefined,
    disable: def.disable || [],
    toolbarLayout: def.toolbarLayout,
    hoverClickVariant: def.hoverClickVariant,
    rules: normalizeRules(def.rules, canvas),
    tools: def.tools,
    toolbarExtra: def.toolbarExtra,
    groupSettings: def.groupSettings,
    defaultProps: (def.defaultProps as Record<string, any> | undefined) || {},
    craftProps: def.craftProps || {},
    peerInherit: def.peerInherit,
  };

  return Object.freeze(resolved);
}
