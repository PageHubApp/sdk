import { atom, useAtomState, useAtomValue } from "@zedux/react";
import { ViewAtom } from "../../../Viewport/atoms";
import { ItemToggle, sizingItems } from "../../Helpers/ItemSelector";
import { ViewSelectionAtom } from "../../Label";
import { ToolbarItem } from "../../ToolbarItem";
import { usePresetHandler } from "../usePresetHandler";

// Module-level atom cache — atoms must NOT be created inside render functions
const presetAtomCache = new Map<string, any>();
const getOrCreatePresetAtom = (key: string) => {
  if (!presetAtomCache.has(key)) {
    presetAtomCache.set(key, atom(key, "select"));
  }
  return presetAtomCache.get(key);
};

export const PresetInputWithToggle = ({
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

  const itemListState = getOrCreatePresetAtom(`presetToggle-${propKey}`);

  const [state, setState] = useAtomState(itemListState);

  const toggle = (
    <ItemToggle
      selected={state}
      onChange={value => setState(value)}
      items={sizingItems}
      option={false}
    />
  );

  const handlePresetChange = c => {
    const preset = presets.find(_ => _.var === c || _.title === c);
    applyPreset(preset, propKey, propType, viewSelection, view);
  };

  return (
    <>
      {state === "slider" && (
        <ToolbarItem
          propKey={propKey}
          propType={propType}
          type="slider"
          label={label}
          wrap={wrap}
          labelHide={labelHide || type !== "slider"}
          valueLabels={presets.map(_ => _.title)}
          min={0}
          max={presets.length - 1}
          inline={inline}
          inputWidth={inputWidth}
          labelWidth={labelWidth}
          onChange={handlePresetChange}
          append={toggle}
        />
      )}

      {state === "select" && (
        <ToolbarItem
          propKey={propKey}
          propType={propType}
          type="select"
          label={label}
          wrap={wrap}
          labelHide={labelHide}
          inline={inline}
          inputWidth={inputWidth}
          labelWidth={labelWidth}
          onChange={handlePresetChange}
          append={toggle}
        >
          <option value=""></option>
          {presets?.map((_, k) => (
            <option key={k} value={_.var}>
              {_.title}
            </option>
          ))}
        </ToolbarItem>
      )}

      {state === "px" && (
        <ToolbarItem
          propKey={propKey}
          propType={propType}
          type="text"
          label={label}
          wrap={wrap}
          labelHide={labelHide}
          placeholder="Custom value"
          inline={inline}
          inputWidth={inputWidth}
          labelWidth={labelWidth}
          onChange={handlePresetChange}
          append={toggle}
        />
      )}
    </>
  );
};
