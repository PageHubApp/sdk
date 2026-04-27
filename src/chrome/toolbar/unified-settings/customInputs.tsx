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
import {
  BlockSkeleton,
  ChipSkeleton,
  RowSkeleton,
} from "../../primitives/LoadingBar";

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
  NodeAiContextSection: block(
    React.lazy(() =>
      import("./mainTabs/NodeAiContextSection").then(m => ({ default: m.NodeAiContextSection }))
    )
  ),
  ComponentImportExport: block(
    React.lazy(() =>
      import("../inputs/advanced/ComponentImportExport").then(m => ({
        default: m.ComponentImportExport,
      }))
    )
  ),
  PermissionsSection: block(
    React.lazy(() =>
      import("./registry/PermissionsSection").then(m => ({ default: m.PermissionsSection }))
    )
  ),
  // Popover variant — chip + FloatingPanel.
  ConditionsInput: chip(React.lazy(() => import("../inputs/advanced/ConditionsInputPopover"))),
  // Popover variant — chip + FloatingPanel.
  AnimationsInput: chip(React.lazy(() => import("../inputs/advanced/AnimationsInputPopover"))),
  ContainerScrollEffectSection: block(
    React.lazy(() =>
      import("./mainTabs/ContainerScrollEffectSection").then(m => ({
        default: m.ContainerScrollEffectSection,
      }))
    )
  ),
  ContainerOverflowSection: block(
    React.lazy(() =>
      import("./mainTabs/ContainerOverflowSection").then(m => ({
        default: m.ContainerOverflowSection,
      }))
    )
  ),
  DataSourceSectionSlot: block(
    React.lazy(() =>
      import("./mainTabs/DataSourceSectionSlot").then(m => ({ default: m.DataSourceSectionSlot }))
    )
  ),
  BackgroundSettingsInput: row(
    React.lazy(() =>
      import("../inputs/color/BackgroundSettingsInput").then(m => ({
        default: m.BackgroundSettingsInput,
      }))
    )
  ),
  PatternInput: row(
    React.lazy(() =>
      import("../inputs/color/PatternInput").then(m => ({ default: m.PatternInput }))
    )
  ),
  // Popover variant — chip with gradient swatch + label, opens FloatingPanel editor.
  GradientInput: chip(React.lazy(() => import("../inputs/color/GradientInputPopover"))),
  ClassNameInput: block(
    React.lazy(() =>
      import("../inputs/advanced/ClassNameInput").then(m => ({ default: m.ClassNameInput }))
    )
  ),
  // The registry-resolved "ActionInput" is the popover variant — chip + FloatingPanel.
  ActionInput: chip(React.lazy(() => import("../inputs/action/ActionInputPopover"))),
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
      console.error(`[customInputs] unknown component "${ref}" — add it to lazyMap`);
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
