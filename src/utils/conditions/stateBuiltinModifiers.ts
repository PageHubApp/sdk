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
    {
      // Half-opacity + clicks disabled. Same as the Container variant; lives
      // here too because pagination prev/next are Buttons.
      name: "disabled-look",
      label: "Disabled (half-opacity, no clicks)",
      category: "State",
      classes: "opacity-50 pointer-events-none",
    },
    {
      // PDP variant chip — currently-selected value. Outline + offset gives
      // the same visual weight as the legacy data-attr CSS. Authors can
      // override per-site via Button modifiers.
      name: "chip-selected",
      label: "Chip selected",
      category: "State",
      classes: "outline-2 outline-offset-2 outline-base-content",
    },
    {
      // PDP variant chip — value is unavailable in stock OR clashes with
      // currently-selected other axes. Same look as `disabled-look` plus
      // strikethrough.
      name: "chip-unavailable",
      label: "Chip unavailable",
      category: "State",
      classes: "opacity-40 pointer-events-none line-through cursor-not-allowed",
    },
  ],
  Container: [
    {
      // Editor-only — flips a floating chat panel from `fixed bottom-X right-X`
      // to inline `relative w-full` so authors can edit its children. Wrapper
      // (AgentFloatingBubble) writes the gating state with
      // `source: "editor-preview"`. `flex` overrides the base `hidden` via
      // twMerge (same display group, last token wins). Position keywords +
      // `w-full max-w-full h-auto max-h-none` clobber the fixed positioning.
      name: "bubble-expanded",
      label: "Bubble expanded (editor)",
      category: "State",
      classes:
        "relative top-auto right-auto bottom-auto left-auto w-full max-w-full h-auto max-h-none flex",
    },
    {
      // Generic "show me" modifier — append `flex` to clobber a base `hidden`
      // class via twMerge's display-group resolution. Pairs with a `state`
      // condition so panels and backdrops can react to the same registry key
      // without sharing a DOM `id` (which would be invalid HTML).
      name: "shown-flex",
      label: "Shown (flex)",
      category: "State",
      classes: "flex",
    },
    {
      // Same as `shown-flex` but for nodes that need block layout when shown.
      name: "shown-block",
      label: "Shown (block)",
      category: "State",
      classes: "block",
    },
    {
      // Generic "disabled" look — half-opacity + clicks disabled. Pair with a
      // `state` condition that gates "out of bounds" / "missing input" cases
      // (pagination prev/next at the edges, submit button before required
      // fields are filled, etc.).
      name: "disabled-look",
      label: "Disabled (half-opacity, no clicks)",
      category: "State",
      classes: "opacity-50 pointer-events-none",
    },
  ],
};
