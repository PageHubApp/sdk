import { buildFallbackToHTML, humanize, normalizeRules } from "./helpers";
import {
  COMPONENT_DEF_BRAND,
  type PageHubComponentDef,
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

  const resolved: ResolvedComponentDef<P> = {
    [COMPONENT_DEF_BRAND]: true,
    name: def.name,
    displayName: def.displayName || humanize(def.name),
    description: def.description,
    component: def.component,
    toHTML: def.toHTML || buildFallbackToHTML(canvas),
    icon: def.icon,
    category: def.category || "Custom",
    canvas,
    settings: def.settings,
    advancedSettings: def.advancedSettings,
    props: def.props,
    disable: def.disable || [],
    toolbarLayout: def.toolbarLayout,
    hoverClickVariant: def.hoverClickVariant,
    rules: normalizeRules(def.rules, canvas),
    tools: def.tools,
    toolbarExtra: def.toolbarExtra,
    groupSettings: def.groupSettings,
    defaultProps: def.defaultProps || {},
    craftProps: def.craftProps || {},
    presets: def.presets || [],
    modifiers: def.modifiers || [],
    peerInherit: def.peerInherit,
  };

  return Object.freeze(resolved);
}
