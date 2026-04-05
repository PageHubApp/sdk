// @ts-nocheck
import type { PresetGroup } from "utils/design/selectorPresets";
import { PresetInput } from "./PresetInput";

/**
 * Renders a preset input from a PresetGroup configuration
 * Automatically extracts label, type, items, propKey, propType, and help from the preset group
 */
export const PresetRenderer: React.FC<{
  preset: PresetGroup;
  inline?: boolean;
  inputWidth?: string;
  labelWidth?: string;
}> = ({ preset, inline, inputWidth, labelWidth }) => {
  return (
    <PresetInput
      presets={preset.items}
      label={preset.label}
      type={preset.type || "select"}
      propKey={preset.propKey}
      propType={preset.propType}
      labelHide={false}
      inline={inline}
      inputWidth={inputWidth}
      labelWidth={labelWidth}
    />
  );
};

/**
 * Renders multiple presets from a preset group object
 * Automatically loops over all presets in the group and renders them
 *
 * @example
 * <PresetGroupRenderer presets={selectorPresets.container} keys={['padding', 'width', 'maxWidth']} />
 */
export const PresetGroupRenderer: React.FC<{
  presets: Record<string, PresetGroup>;
  keys?: string[];
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  inline?: boolean;
  inputWidth?: string;
  labelWidth?: string;
}> = ({ presets, keys, wrapper: Wrapper, inline, inputWidth, labelWidth }) => {
  const presetsToRender = keys
    ? keys.map(key => ({ key, preset: presets[key] })).filter(p => p.preset)
    : Object.entries(presets).map(([key, preset]) => ({ key, preset }));

  const content = presetsToRender.map(({ key, preset }) => (
    <PresetRenderer
      key={key}
      preset={preset}
      inline={inline}
      inputWidth={inputWidth}
      labelWidth={labelWidth}
    />
  ));

  if (Wrapper) {
    return <Wrapper>{content}</Wrapper>;
  }

  return <>{content}</>;
};
