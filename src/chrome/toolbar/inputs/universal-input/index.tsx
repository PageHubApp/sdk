/**
 * UniversalInput — Craft-bound universal value editor.
 *
 * Thin wrapper: hooks up state (via `useUniversalInputState` which reads /
 * writes through `useNode` + `useEditor`) and renders the shared
 * `UniversalInputView`. For a non-Craft variant (e.g. inside the VarPicker
 * token editor), use `UniversalInputControlled`.
 */
import { UniversalInputView } from "./UniversalInputView";
import { UniversalInputProps } from "./types";
import { useDesignVars } from "./hooks/useDesignVars";
import { useInputHandlers } from "./useInputHandlers";
import { useUniversalInputState } from "./useUniversalInputState";

// Re-export types for external use
export type { UniversalInputProps, ValueType } from "./types";
export { UniversalInputControlled } from "./UniversalInputControlled";

export function UniversalInput(props: UniversalInputProps) {
  const {
    label,
    labelPrefix,
    labelSuffix,
    labelHide = false,
    labelWidth = "",
    inputWidth = "",
    placeholder = "Enter value",
    showVarSelector = true,
    allowedTypes,
    wrap = "",
    index = null,
    propItemKey,
    inline = true,
    propType = "class",
    propKey,
    propTag,
    tailwindKey,
    hideTypeSelector = false,
  } = props;

  const state = useUniversalInputState(props);
  const handlers = useInputHandlers({ ...state, showVarSelector });
  const designVars = useDesignVars();

  return (
    <UniversalInputView
      label={label}
      labelPrefix={labelPrefix}
      labelSuffix={labelSuffix}
      labelHide={labelHide}
      labelWidth={labelWidth}
      inputWidth={inputWidth}
      placeholder={placeholder}
      showVarSelector={showVarSelector}
      allowedTypes={allowedTypes}
      wrap={wrap}
      index={index}
      propItemKey={propItemKey}
      inline={inline}
      propType={propType}
      propKey={propKey}
      propTag={propTag}
      tailwindKey={tailwindKey}
      hideTypeSelector={hideTypeSelector}
      renderBreakpointPills
      state={state}
      handlers={handlers}
      designVars={designVars}
    />
  );
}
