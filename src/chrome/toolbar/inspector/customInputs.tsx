/**
 * Custom-input registry — string keys → lazy React components.
 *
 * Schema files (schema.ts) reference inputs by string ("TypographyPresetInput")
 * so they can stay pure data with zero React imports. PropertyRenderer looks
 * up the component here when `input.type === "custom"` and `component` is a string.
 */
import React from "react";
import type { ComponentType, ReactNode } from "react";
import type { PropertyInputProps } from "./registry/propertyDefs";
import { BlockSkeleton, ChipSkeleton, RowSkeleton } from "../../primitives/LoadingBar";
import { sdkLog } from "../../../utils/logger";

/**
 * Per-entry shape: lazy component + the Suspense fallback to render while
 * the chunk loads. Default fallback is `RowSkeleton` (ghost label + input)
 * because most inline rows look like that. Block-style inputs (Conditions,
 * Properties, etc.) opt into `BlockSkeleton`; chip-style triggers use
 * `ChipSkeleton`. Hosts can pass `fallback: <CustomNode />` via
 * `registerCustomInput` for one-off cases.
 */
type LazyEntry = {
  lazy: React.LazyExoticComponent<ComponentType<any>>;
  fallback?: ReactNode;
};

const row = (lazy: React.LazyExoticComponent<ComponentType<any>>): LazyEntry => ({
  lazy,
  fallback: <RowSkeleton />,
});
const block = (lazy: React.LazyExoticComponent<ComponentType<any>>): LazyEntry => ({
  lazy,
  fallback: <BlockSkeleton />,
});
const chip = (lazy: React.LazyExoticComponent<ComponentType<any>>): LazyEntry => ({
  lazy,
  fallback: <ChipSkeleton />,
});

const lazyMap: Record<string, LazyEntry> = {
  TypographyPresetInput: row(
    React.lazy(() =>
      import("../inputs/typography/TypographyPresetInput").then(m => ({
        default: m.TypographyPresetInput,
      }))
    )
  ),
  FontFamilyInput: row(
    React.lazy(() =>
      import("../inputs/typography/FontFamilyInput").then(m => ({
        default: m.FontFamilyInput,
      }))
    )
  ),
  LayoutPresetSlot: row(
    React.lazy(() =>
      import("./registry/properties/LayoutPresetSlot").then(m => ({
        default: m.LayoutPresetSlot,
      }))
    )
  ),
  PropertiesInput: block(
    React.lazy(() =>
      import("../inputs/advanced/PropertiesInput").then(m => ({ default: m.PropertiesInput }))
    )
  ),
  // Popover variant — chip + FloatingPanel hosting the AI context editor.
  NodeAiContextSection: chip(
    React.lazy(() => import("../inputs/advanced/NodeAiContextInputPopover"))
  ),
  // Popover variant — chip + FloatingPanel hosting the import/export editor.
  ComponentImportExport: chip(
    React.lazy(() => import("../inputs/advanced/ComponentImportExportPopover"))
  ),
  PermissionsSection: block(
    React.lazy(() =>
      import("./registry/PermissionsSection").then(m => ({ default: m.PermissionsSection }))
    )
  ),
  // Body — N editable condition chips. Each chip lazy-loads its own
  // ConditionEditorPanel on click. Pinned (always renders) so the empty
  // body is fine until the user picks the first type from the header `+`.
  ConditionsInput: block(
    React.lazy(() =>
      import("../inputs/advanced/ConditionsInput").then(m => ({ default: m.ConditionsInput }))
    )
  ),
  // Section-header `+` picker. Popover-mode so AccordionAddMenu mounts it
  // inside the conditions section title row. Picking a category appends a
  // condition to `props.conditionGroups` and the body auto-opens the new chip.
  ConditionsAddPicker: chip(React.lazy(() => import("../inputs/advanced/ConditionsAddPicker"))),
  // State bindings — `props.stateModifiers` array. When the named state matches
  // the binding's conditions at runtime, modifier classes are appended to the
  // node's className.
  StateBindingsInput: block(
    React.lazy(() =>
      import("../inputs/state/StateBindingsInput").then(m => ({
        default: m.StateBindingsInput,
      }))
    )
  ),
  StateBindingsAddPicker: chip(React.lazy(() => import("../inputs/state/StateBindingsAddPicker"))),
  // Container-only state-registry wiring: visibilityStateKey + computedStateBindings.
  // Renders alongside StateBindingsInput in the Interactions > State section.
  ContainerStateBody: block(
    React.lazy(() =>
      import("./mainTabs/ContainerStateSection").then(m => ({
        default: m.ContainerStateBody,
      }))
    )
  ),
  // Popover variant — chip + FloatingPanel.
  AnimationsInput: chip(React.lazy(() => import("../inputs/advanced/AnimationsInputPopover"))),
  ContainerScrollEffectSection: block(
    React.lazy(() =>
      import("./mainTabs/ContainerScrollEffectSection").then(m => ({
        default: m.ContainerScrollEffectSection,
      }))
    )
  ),
  // Popover variant — chip + FloatingPanel for each effect row.
  EffectRowInput: chip(
    React.lazy(() => import("./registry/properties/effects-builder/EffectRowInputPopover"))
  ),
  // Popover variant — chip + FloatingPanel hosting the overflow editor.
  ContainerOverflowSection: chip(
    React.lazy(() => import("../inputs/advanced/ContainerOverflowSectionPopover"))
  ),
  DataSourceSectionSlot: block(
    React.lazy(() =>
      import("./mainTabs/DataSourceSectionSlot").then(m => ({ default: m.DataSourceSectionSlot }))
    )
  ),
  // Popover variant — chip with image thumbnail + label, opens FloatingPanel
  // hosting the slim media picker. The chip's `trailingExtras` slot renders
  // a sliders icon that opens `ImageSettingsPanel` (Focal Point + the 9
  // registered `image-settings` properties) — same trailingExtras pattern
  // docs §1 documents (Layout chip's "+ Add container", show-hide chip's
  // eye toggle).
  BackgroundImageInput: chip(
    React.lazy(() => import("../inputs/color/BackgroundImageInputPopover"))
  ),
  // Popover variant — chip with pattern thumbnail + label, opens FloatingPanel editor.
  PatternInput: chip(React.lazy(() => import("../inputs/color/PatternInputPopover"))),
  // Popover variant — chip with gradient swatch + label, opens FloatingPanel editor.
  GradientInput: chip(React.lazy(() => import("../inputs/color/GradientInputPopover"))),
  ClassNameInput: block(
    React.lazy(() =>
      import("../inputs/advanced/ClassNameInput").then(m => ({ default: m.ClassNameInput }))
    )
  ),
  // List-style Action section (mirrors Conditions): body chip-list + header
  // `+` picker. Each action chip lazy-loads its own ActionEditorPanel on
  // click. See ActionsInput.tsx + docs/sdk/editor-popover-pattern.md §8.
  ActionsInput: block(
    React.lazy(() =>
      import("../inputs/action/ActionsInput").then(m => ({ default: m.ActionsInput }))
    )
  ),
  ActionsAddPicker: chip(React.lazy(() => import("../inputs/action/ActionsAddPicker"))),
  // Sibling Handlers section — chip-list of `props.handlers` (event → JS
  // string map). Each handler chip lazy-loads its own HandlerEditorPanel.
  // See HandlersInput.tsx + docs/sdk/editor-popover-pattern.md §8.
  HandlersInput: block(
    React.lazy(() =>
      import("../inputs/action/HandlersInput").then(m => ({ default: m.HandlersInput }))
    )
  ),
  HandlersAddPicker: chip(React.lazy(() => import("../inputs/action/HandlersAddPicker"))),
  FlexDirectionInput: row(
    React.lazy(() =>
      import("../inputs/layout/FlexDirectionInput").then(m => ({
        default: m.FlexDirectionInput,
      }))
    )
  ),
  TailwindInput: row(
    React.lazy(() =>
      import("../inputs/advanced/TailwindInput").then(m => ({ default: m.TailwindInput }))
    )
  ),
  // Body — N modifier chips (one per `props.root.activeModifiers` entry).
  // X removes the modifier; click dispatches an open-request to the picker.
  ModifierChipList: block(
    React.lazy(() =>
      import("../inputs/modifiers/ModifierChipList").then(m => ({
        default: m.ModifierChipList,
      }))
    )
  ),
  // Section-header `+` picker. Popover-mode so AccordionAddMenu mounts it
  // inside the modifiers section title row. Opens a FloatingPanel with the
  // categorized preview-rich library (Pattern cards, exclusive segmented
  // controls, dropdowns, free chips) and the "Save as modifier" footer.
  ModifiersAddPicker: chip(React.lazy(() => import("../inputs/modifiers/ModifiersAddPicker"))),
  // Component-tab affordance for preset wrappers — Add Item / delete-row UI
  // driven by `node.data.custom.preset` + `presetRegistry.ts`. See
  // packages/sdk/src/chrome/toolbar/inputs/preset/PresetAddChildList.tsx.
  PresetAddChildList: block(
    React.lazy(() =>
      import("../inputs/preset/PresetAddChildList").then(m => ({
        default: m.PresetAddChildList,
      }))
    )
  ),
};

// Cache the Suspense-wrapped component per registry key. Without this, every
// PropertyRenderer re-render produces a new component reference, which makes
// React unmount + remount the underlying input — killing local useState
// (open popovers, drafts, etc.). Stable reference = stable component instance.
const wrappedCache = new Map<string, ComponentType<PropertyInputProps>>();

export function resolveCustomInput(
  ref: ComponentType<PropertyInputProps> | string
): ComponentType<PropertyInputProps> {
  if (typeof ref !== "string") return ref;
  const cached = wrappedCache.get(ref);
  if (cached) return cached;
  const entry = lazyMap[ref];
  if (!entry) {
    if (process.env.NODE_ENV !== "production") {
      sdkLog.error(`[customInputs] unknown component "${ref}" — add it to lazyMap`);
    }
    const empty: ComponentType<PropertyInputProps> = () => null;
    wrappedCache.set(ref, empty);
    return empty;
  }
  const { lazy: Lazy, fallback } = entry;
  const Wrapped: ComponentType<PropertyInputProps> = props => (
    <React.Suspense fallback={fallback ?? <RowSkeleton />}>
      <Lazy {...(props as any)} />
    </React.Suspense>
  );
  Wrapped.displayName = `CustomInput(${ref})`;
  wrappedCache.set(ref, Wrapped);
  return Wrapped;
}

/**
 * Register a custom input under `key`. Optionally pass `fallback` to control
 * what the Suspense boundary renders while the chunk loads — defaults to a
 * ghost label+input row. Pass `<BlockSkeleton />`, `<ChipSkeleton />`, or any
 * custom node to match the input's footprint.
 */
export function registerCustomInput(
  key: string,
  component: ComponentType<any>,
  options?: { fallback?: ReactNode }
) {
  lazyMap[key] = {
    lazy: React.lazy(() => Promise.resolve({ default: component })),
    fallback: options?.fallback,
  };
  // Invalidate the wrapped cache so the next resolve picks up the new lazy.
  wrappedCache.delete(key);
}
