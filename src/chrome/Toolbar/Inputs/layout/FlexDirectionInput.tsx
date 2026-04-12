import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import type { ComponentType } from "react";
import { Tooltip } from "components/layout/Tooltip";
import { TbBoxAlignBottom, TbBoxAlignLeft, TbBoxAlignRight, TbBoxAlignTop } from "react-icons/tb";
import { ViewAtom } from "../../../Viewport/atoms";
import { changeProp, getPropFinalValue } from "../../../Viewport/lib";
import { getEffectiveViews, ViewSelectionAtom } from "../../Label";
import { ToolbarSegmentedControl } from "../../Helpers/ToolbarSegmentedControl";
import { Wrap } from "../../ToolbarStyle";

type FlexMode = "columns" | "rows" | undefined;

interface FlexDirectionInputProps {
  wrap?: string;
  inline?: boolean;
  mode?: FlexMode;
}

type DirOption = { value: string; hint: string; icon: ComponentType<{ className?: string }> };

function getDirectionOptions(mode: FlexMode | undefined): DirOption[] {
  if (mode === "columns") {
    return [
      { value: "flex-col", hint: "Top to Bottom", icon: TbBoxAlignTop },
      { value: "flex-col-reverse", hint: "Bottom to Top", icon: TbBoxAlignBottom },
    ];
  }
  if (mode === "rows") {
    return [
      { value: "flex-row", hint: "Left to Right", icon: TbBoxAlignLeft },
      { value: "flex-row-reverse", hint: "Right to Left", icon: TbBoxAlignRight },
    ];
  }
  return [
    { value: "flex-col", hint: "Top to Bottom", icon: TbBoxAlignTop },
    { value: "flex-col-reverse", hint: "Bottom to Top", icon: TbBoxAlignBottom },
    { value: "flex-row", hint: "Left to Right", icon: TbBoxAlignLeft },
    { value: "flex-row-reverse", hint: "Right to Left", icon: TbBoxAlignRight },
  ];
}

export const FlexDirectionInput = ({ wrap = "", inline = true, mode }: FlexDirectionInputProps) => {
  const view = useAtomValue(ViewAtom);
  const viewSelection = useAtomValue(ViewSelectionAtom);
  const classDark = viewSelection.dark ?? false;
  const { query, actions } = useEditor();
  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data.props || {},
    id: node.id,
  }));

  const { value, viewValue } = getPropFinalValue(
    { propKey: "flexDirection", propType: "class", label: "Direction", labelHide: true },
    view,
    nodeProps,
    classDark
  );

  const options = getDirectionOptions(mode);
  const values = options.map(o => o.value);
  const raw = String(value ?? "");
  const selected = values.includes(raw) ? raw : values[0];

  const pushDirection = (next: string) => {
    const effectiveViews = getEffectiveViews(viewSelection, view);
    effectiveViews.forEach(targetView => {
      changeProp({
        propKey: "flexDirection",
        value: next,
        setProp,
        view: targetView,
        propType: "class",
        query,
        actions,
        nodeId: id,
        classDark,
      });
    });
  };

  return (
    <Wrap
      props={{ label: "Direction", labelHide: true }}
      lab={raw}
      viewValue={viewValue}
      propType="class"
      propKey="flexDirection"
      wrap={wrap}
      inline={inline}
    >
      <ToolbarSegmentedControl
        aria-label="Flex direction"
        dense
        value={selected}
        onChange={v => pushDirection(v)}
        options={options.map(o => {
          const Icon = o.icon;
          return {
            value: o.value,
            label: (
              <Tooltip content={o.hint}>
                <Icon className="size-4 shrink-0" aria-hidden />
              </Tooltip>
            ),
          };
        })}
      />
    </Wrap>
  );
};
