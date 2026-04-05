// @ts-nocheck
import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { ViewAtom } from "../../../Viewport/atoms";
import { changeProp, getPropFinalValue } from "../../../Viewport/lib";
import { getRect } from "../../../Viewport/useRect";
import { useMemo, useRef } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { usePalette } from "utils/design/PaletteContext";
import {
  formatColorForStorage,
  parseColorValue,
  resolveColorForDisplay,
  resolvePaletteReference,
} from "utils/design/colorSystem";
import { editorCanvasViewToClassPrefixKey } from "../../../../utils/tailwind/className";
import { ViewSelectionAtom } from "../../Label";
import { Wrap } from "../../ToolbarStyle";
import { ColorPickerAtom } from "../../Tools/ColorPickerDialog";
import { useDialog } from "../../Tools/lib";

export const ColorInput = (__props: any) => {
  const {
    propKey,
    label = "",
    prefix = "",
    index = null,
    propItemKey = "",
    propType = "class",
    showPallet = true,
    onChange = () => {},
    labelHide = false,
    inline = false,
    inputWidth = "",
    labelWidth = "",
  } = __props;

  const [dialog, setDialog] = useAtomState(ColorPickerAtom);
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;

  const { actions, query } = useEditor();

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data.props || {},
    id: node.id,
  }));

  // Match class writes (base on full-width canvas) — getProp(..., "desktop") would only see md: layer.
  const { value: resolved } = getPropFinalValue(__props, view, nodeProps, classDark);
  const value = resolved || "";

  // Try to get palette from context first, fallback to ROOT_NODE
  const contextPalette = usePalette();
  const palette = useMemo(() => {
    // Use context palette if available
    if (contextPalette && contextPalette.length > 0) {
      return contextPalette;
    }

    // Fallback to ROOT_NODE
    try {
      const rootNode = query.node(ROOT_NODE).get();
      return rootNode?.data?.props?.pallet || [];
    } catch {
      return [];
    }
  }, [contextPalette, query]);

  // Resolve palette references for display (handles backward compatibility)
  const displayValue = resolvePaletteReference(value, prefix);
  const [bg, cpVal] = parseColorValue(displayValue, prefix);

  // Get the actual color value for inline style
  const finalStyle = resolveColorForDisplay(displayValue, prefix, palette);

  const classWriteView = propType === "class" ? editorCanvasViewToClassPrefixKey(view) : undefined;

  const changed = data => {
    if (!data) return;

    const val = formatColorForStorage(data, prefix);

    changeProp({
      propKey,
      index,
      propItemKey,
      propType,
      value: val,
      setProp,
      query,
      actions,
      nodeId: id,
      ...(propType === "class" && classWriteView != null ? { view: classWriteView, classDark } : {}),
    });

    onChange(cpVal, val);
  };

  const ref = useRef(null);

  useDialog(dialog, setDialog, ref, propKey);

  // For the color picker, pass the original value if it's a palette reference
  // so the picker can highlight the selected palette color
  const pickerValue = value && value.includes("palette:") ? value : cpVal;

  // Determine viewValue for the label
  let viewValue = view;
  if (propType === "component" || propType === "root") {
    viewValue = "component";
  } else if (index) {
    viewValue = index;
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    changeProp({
      propKey,
      index,
      propItemKey,
      propType,
      value: "",
      setProp,
      query,
      actions,
      nodeId: id,
      ...(propType === "class" && classWriteView != null ? { view: classWriteView, classDark } : {}),
    });
    onChange("", "");
  };

  return (
    <div ref={ref}>
      <Wrap
        props={{ label, labelHide }}
        index={index}
        lab={value}
        viewValue={viewValue}
        propType={propType}
        propKey={propKey}
        propItemKey={propItemKey}
        inline={inline}
        inputWidth={inputWidth}
        labelWidth={labelWidth}
      >
        <div className="relative">
          <button
            id={`input-${propKey}`}
            className="input-color"
            style={finalStyle}
            onClick={e => {
              setDialog({
                enabled: !dialog.enabled,
                value: pickerValue,
                prefix,
                changed,
                showPallet,
                propKey,
                e: getRect(ref.current),
              });
            }}
          ></button>

          {/* Clear button - only show when color is set */}
          {value && (
            <button
              onClick={handleClear}
              className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
              title="Clear color"
            >
              ×
            </button>
          )}
        </div>
      </Wrap>
    </div>
  );
};
