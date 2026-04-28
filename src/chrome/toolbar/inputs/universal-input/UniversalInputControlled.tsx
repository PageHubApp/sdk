/**
 * UniversalInputControlled — `value` / `onChange` variant of `UniversalInput`.
 *
 * Used by surfaces that need the same editing UX (tailwind autocomplete, var
 * picker, calc dialog, type-selector chip) WITHOUT writing through CraftJS —
 * primarily the VarPicker token editor where there's no selected node.
 *
 * Skips `useNode()` / responsive scoping. Renders the same
 * `UniversalInputView`. Exposes a subset of `UniversalInputProps` minus the
 * Craft-only fields (`propKey` / `propType` / `index` / `propItemKey`).
 */
import { UniversalInputView } from "./UniversalInputView";
import { ValueType } from "./types";
import { useControlledInputState } from "./hooks/useControlledInputState";
import { useDesignVars } from "./hooks/useDesignVars";
import { useInputHandlers } from "./useInputHandlers";

export interface UniversalInputControlledProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  labelHide?: boolean;
  labelWidth?: string;
  inputWidth?: string;
  placeholder?: string;
  showVarSelector?: boolean;
  allowedTypes?: ValueType[];
  wrap?: string;
  inline?: boolean;
  propTag?: string;
  tailwindKey?: string;
  tailwindOptions?: string[];
  overrideType?: ValueType;
  hideTypeSelector?: boolean;
}

export function UniversalInputControlled(props: UniversalInputControlledProps) {
  const {
    value,
    onChange,
    label,
    labelHide = false,
    labelWidth = "",
    inputWidth = "",
    placeholder = "Enter value",
    showVarSelector = true,
    allowedTypes,
    wrap = "",
    inline = true,
    propTag,
    tailwindKey,
    tailwindOptions,
    overrideType,
    hideTypeSelector = false,
  } = props;

  const state = useControlledInputState({
    value,
    onChange,
    propTag,
    tailwindKey,
    tailwindOptions,
    allowedTypes,
    overrideType,
  });
  const handlers = useInputHandlers({ ...state, showVarSelector });
  const designVars = useDesignVars();

  return (
    <UniversalInputView
      label={label}
      labelHide={labelHide}
      labelWidth={labelWidth}
      inputWidth={inputWidth}
      placeholder={placeholder}
      showVarSelector={showVarSelector}
      allowedTypes={allowedTypes}
      wrap={wrap}
      inline={inline}
      propType="controlled"
      propTag={propTag}
      tailwindKey={tailwindKey}
      hideTypeSelector={hideTypeSelector}
      renderBreakpointPills={false}
      state={state}
      handlers={handlers}
      designVars={designVars}
    />
  );
}
