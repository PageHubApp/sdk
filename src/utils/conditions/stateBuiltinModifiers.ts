/**
 * Viewer-safe registry of built-in state modifiers.
 *
 * `applyStateModifiers` runs on every render path, including the viewer
 * bundle (`/view`, `/static`, custom domains). The full `BUILTIN_COMPONENT_DEFS`
 * pulls every `.craft.tsx` file and through them the entire editor toolbar
 * chrome (`ButtonMainTab`, `ToolbarItem`, …) — fine for the editor, fatal
 * for the viewer bundle size and SSR safety.
 *
 * State-bound modifiers are a TINY subset of the full modifier list — only
 * the ones authors reference from `props.stateModifiers`. Keeping that
 * subset here, with no editor imports, lets the viewer resolve modifier
 * names without dragging chrome along.
 *
 * Sync rule: every entry below MUST also exist in the corresponding
 * component's `.craft.tsx` modifiers list (so the editor picker and the
 * runtime use the same name). Site-saved overrides on
 * `ROOT.props.modifiers[<componentName>]` win, just like the editor.
 */

import type { ComponentModifier } from "../../define";

export const BUILTIN_STATE_MODIFIERS: Record<string, ComponentModifier[]> = {
  Button: [
    {
      name: "tab-active",
      label: "Active",
      category: "State",
      classes: "border-primary text-primary",
    },
  ],
  Container: [],
};
