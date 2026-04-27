/**
 * PatternPanelBody — the full pattern editing surface rendered inside
 * PatternPanel (FloatingPanel). Contains the pattern picker, color slots,
 * and all 7 sliders. Extracted from PatternInput so it can live in the
 * floating panel without the outer ToolbarSection wrapper.
 */
import { useNode } from "@craftjs/core";
import { ToolbarItem } from "../../ToolbarItem";
import { ColorInput } from "./ColorInput";
import { PatternsDialogInput } from "./PatternsDialogInput";

export function PatternPanelBody() {
  const { pattern } = useNode(node => ({
    pattern: node.data?.props?.root?.pattern || null,
  }));

  return (
    <div className="flex flex-col gap-2">
      {/* Pattern picker */}
      <PatternsDialogInput propKey="pattern" propType="root" />

      {pattern && (
        <>
          {/* Color slots — pattern.colors includes the background, so
              we render (colors - 1) editable slots */}
          <div className="flex flex-col gap-1">
            {[...Array(Math.max(0, +pattern.colors - 1)).keys()].map(i => (
              <ColorInput
                key={i}
                propKey={`patternColor${i + 1}`}
                label={`Color ${i + 1}`}
                prefix=""
                propType="root"
                inline
              />
            ))}
          </div>

          {/* Parameter sliders */}
          <div className="flex flex-col gap-0.5">
            <ToolbarItem
              propKey="patternZoom"
              propType="root"
              type="slider"
              label="Scale"
              max={pattern.maxScale}
              min={1}
            />
            <ToolbarItem
              propKey="patternStroke"
              propType="root"
              type="slider"
              label="Stroke"
              max={pattern.maxStroke || 5}
              min={0.5}
              step={0.5}
            />
            <ToolbarItem
              propKey="patternAngle"
              propType="root"
              type="slider"
              label="Angle"
              max={180}
              min={0}
            />
            <ToolbarItem
              propKey="patternSpacingX"
              propType="root"
              type="slider"
              label="X Gap"
              max={pattern.maxSpacing?.[0] || 10}
              min={0}
            />
            <ToolbarItem
              propKey="patternSpacingY"
              propType="root"
              type="slider"
              label="Y Gap"
              max={pattern.maxSpacing?.[1] || 10}
              min={0}
            />
            <ToolbarItem
              propKey="patternVerticalPosition"
              propType="root"
              type="slider"
              label="Offset Y"
              max={0}
              min={-120}
            />
            <ToolbarItem
              propKey="patternHorizontalPosition"
              propType="root"
              type="slider"
              label="Offset X"
              max={0}
              min={-120}
            />
          </div>
        </>
      )}

      {!pattern && (
        <p className="text-neutral-content py-2 text-center text-xs">
          Select a pattern above to edit colors and settings.
        </p>
      )}
    </div>
  );
}
