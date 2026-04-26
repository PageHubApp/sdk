/**
 * Custom-input registry — string keys → lazy React components.
 *
 * Schema files (schema.ts) reference inputs by string ("TypographyPresetInput")
 * so they can stay pure data with zero React imports. PropertyRenderer looks
 * up the component here when `input.type === "custom"` and `component` is a string.
 */
import React from "react";
import type { ComponentType } from "react";
import type { PropertyInputProps } from "./registry/propertyDefs";
import { LoadingBarSuspenseFallback } from "../../primitives/LoadingBar";

const lazyMap: Record<string, React.LazyExoticComponent<ComponentType<any>>> = {
  TypographyPresetInput: React.lazy(() =>
    import("../inputs/typography/TypographyPresetInput").then(m => ({
      default: m.TypographyPresetInput,
    }))
  ),
  FontFamilyInput: React.lazy(() =>
    import("../inputs/typography/FontFamilyInput").then(m => ({ default: m.FontFamilyInput }))
  ),
  LayoutPresetSlot: React.lazy(() =>
    import("./registry/properties/LayoutPresetSlot").then(m => ({ default: m.LayoutPresetSlot }))
  ),
  PropertiesInput: React.lazy(() =>
    import("../inputs/advanced/PropertiesInput").then(m => ({ default: m.PropertiesInput }))
  ),
  NodeAiContextSection: React.lazy(() =>
    import("./mainTabs/NodeAiContextSection").then(m => ({ default: m.NodeAiContextSection }))
  ),
  ComponentImportExport: React.lazy(() =>
    import("../inputs/advanced/ComponentImportExport").then(m => ({
      default: m.ComponentImportExport,
    }))
  ),
  PermissionsSection: React.lazy(() =>
    import("./registry/PermissionsSection").then(m => ({ default: m.PermissionsSection }))
  ),
  ConditionsInput: React.lazy(() =>
    import("../inputs/advanced/ConditionsInput").then(m => ({ default: m.ConditionsInput }))
  ),
  AnimationsInput: React.lazy(() =>
    import("../inputs/advanced/AnimationsInput").then(m => ({ default: m.AnimationsInput }))
  ),
  ContainerScrollEffectSection: React.lazy(() =>
    import("./mainTabs/ContainerScrollEffectSection").then(m => ({
      default: m.ContainerScrollEffectSection,
    }))
  ),
  ContainerOverflowSection: React.lazy(() =>
    import("./mainTabs/ContainerOverflowSection").then(m => ({
      default: m.ContainerOverflowSection,
    }))
  ),
  DataSourceSectionSlot: React.lazy(() =>
    import("./mainTabs/DataSourceSectionSlot").then(m => ({ default: m.DataSourceSectionSlot }))
  ),
  FilterPreviewTileFilter: React.lazy(() =>
    import("../inputs/effects/FilterPreviewTile").then(m => ({ default: m.FilterPreviewTileFilter }))
  ),
  FilterPreviewTileBackdrop: React.lazy(() =>
    import("../inputs/effects/FilterPreviewTile").then(m => ({
      default: m.FilterPreviewTileBackdrop,
    }))
  ),
  BackgroundSettingsInput: React.lazy(() =>
    import("../inputs/color/BackgroundSettingsInput").then(m => ({
      default: m.BackgroundSettingsInput,
    }))
  ),
  PatternInput: React.lazy(() =>
    import("../inputs/color/PatternInput").then(m => ({ default: m.PatternInput }))
  ),
  GradientInput: React.lazy(() =>
    import("../inputs/color/GradientInput").then(m => ({ default: m.GradientInput }))
  ),
  BorderSidesPicker: React.lazy(() =>
    import("../inputs/border/BorderSidesPicker").then(m => ({ default: m.BorderSidesPicker }))
  ),
  ClassNameInput: React.lazy(() =>
    import("../inputs/advanced/ClassNameInput").then(m => ({ default: m.ClassNameInput }))
  ),
  ActionInput: React.lazy(() => import("../inputs/action/ActionInput")),
  FlexDirectionInput: React.lazy(() =>
    import("../inputs/layout/FlexDirectionInput").then(m => ({ default: m.FlexDirectionInput }))
  ),
  TailwindInput: React.lazy(() =>
    import("../inputs/advanced/TailwindInput").then(m => ({ default: m.TailwindInput }))
  ),
};

export function resolveCustomInput(
  ref: ComponentType<PropertyInputProps> | string
): ComponentType<PropertyInputProps> {
  if (typeof ref !== "string") return ref;
  const Lazy = lazyMap[ref];
  if (!Lazy) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[customInputs] unknown component "${ref}" — add it to lazyMap`);
    }
    return () => null;
  }
  const Wrapped: ComponentType<PropertyInputProps> = props => (
    <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
      <Lazy {...(props as any)} />
    </React.Suspense>
  );
  return Wrapped;
}

export function registerCustomInput(key: string, component: ComponentType<any>) {
  // Allow host apps to extend the registry. Wraps in a lazy-friendly shim.
  lazyMap[key] = React.lazy(() => Promise.resolve({ default: component }));
}
