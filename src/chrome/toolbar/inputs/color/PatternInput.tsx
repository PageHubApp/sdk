import { useNode } from "@craftjs/core";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { ColorInput } from "./ColorInput";
import { PatternsDialogInput } from "./PatternsDialogInput";

export const PatternInput = () => {
  const { props } = useNode(node => ({
    props: node.data.props,
  }));

  const pattern = props.root?.pattern || {};

  return (
    <ToolbarSection title="Pattern" nested={true}>
      <PatternsDialogInput propKey="pattern" propType="root" />

      {props.root?.pattern && (
        <>
          {/* Colors */}
          <div className="flex flex-col gap-1 pt-1">
            {[...Array(+pattern.colors - 1).keys()].map(i => (
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

          {/* Parameters */}
          <div className="flex flex-col gap-0.5 pt-1">
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
    </ToolbarSection>
  );
};
