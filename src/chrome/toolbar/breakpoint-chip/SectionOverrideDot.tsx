/**
 * SectionOverrideDot — small primary-color dot rendered next to a section
 * title when at least one prop inside has a non-base breakpoint override.
 *
 * Wraps `useSectionHasAnyOverride` (which calls CraftJS `useNode` internally
 * and therefore requires an <Editor> ancestor). Splitting it into this
 * sub-component lets ToolbarSection itself render in non-editor contexts
 * (e.g. ThemeSettings panel) without crashing — the parent simply doesn't
 * mount this dot when no `propKeys` are bound.
 */
import { useSectionHasAnyOverride } from "./useSectionHasAnyOverride";

interface Props {
  propKeys: string[];
  propType?: string;
}

export function SectionOverrideDot({ propKeys, propType = "class" }: Props) {
  const has = useSectionHasAnyOverride(propKeys, propType);
  if (!has) return null;
  return (
    <span
      className="bg-primary inline-block size-1.5 rounded-full"
      aria-label="Section has breakpoint overrides"
    />
  );
}
