// @ts-nocheck
import { useAtomValue } from "@zedux/react";
import { ViewAtom } from "../../../Viewport/atoms";
import { ViewSelectionAtom } from "../../Label";
import { ToolbarItem } from "../../ToolbarItem";
import { usePresetHandler } from "../usePresetHandler";

export const PresetInput = ({
  presets,
  type = "select",
  label = "Preset Style",
  propKey = "preset",
  propType = "root",
  labelHide = false,
  wrap = "",
  inline = true,
  inputWidth = "",
  labelWidth = "",
}) => {
  const { applyPreset } = usePresetHandler();
  const view = useAtomValue(ViewAtom);
  const viewSelection = useAtomValue(ViewSelectionAtom);

  return (
    <ToolbarItem
      propKey={propKey}
      propType={propType}
      type={type}
      label={label}
      wrap={wrap}
      labelHide={labelHide || type !== "slider"}
      valueLabels={presets.map(_ => _.title)}
      min={0}
      max={presets.length - 1}
      inline={inline}
      inputWidth={inputWidth}
      labelWidth={labelWidth}
      onChange={c => {
        const preset = presets.find(_ => _.var === c || _.title === c);
        applyPreset(preset, propKey, propType, viewSelection, view);
      }}
    >
      <option value=""></option>
      {presets?.map((_, k) => (
        <option key={k} value={_.var}>
          {_.title}
        </option>
      ))}
    </ToolbarItem>
  );
};
