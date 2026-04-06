import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { ViewAtom } from "../../../Viewport/atoms";
import { changeProp, getPropFinalValue } from "../../../Viewport/lib";
import { useMemo, useRef, useState } from "react";
import { useAtomValue } from "@zedux/react";
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
import { TokenPicker } from "./TokenPicker";

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

  const [isOpen, setIsOpen] = useState(false);
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

  const { value: resolved } = getPropFinalValue(__props, view, nodeProps, classDark);
  const value = resolved || "";

  const contextPalette = usePalette();
  const palette = useMemo(() => {
    if (contextPalette && contextPalette.length > 0) return contextPalette;
    try {
      const rootNode = query.node(ROOT_NODE).get();
      return rootNode?.data?.props?.pallet || [];
    } catch {
      return [];
    }
  }, [contextPalette, query]);

  const displayValue = resolvePaletteReference(value, prefix);
  const [bg, cpVal] = parseColorValue(displayValue, prefix);
  const finalStyle = resolveColorForDisplay(displayValue, prefix, palette);

  const classWriteView = propType === "class" ? editorCanvasViewToClassPrefixKey(view) : undefined;

  const changed = (data: any) => {
    if (!data) return;
    const val = formatColorForStorage(data, prefix);
    changeProp({
      propKey, index, propItemKey, propType, value: val, setProp, query, actions, nodeId: id,
      ...(propType === "class" && classWriteView != null ? { view: classWriteView, classDark } : {}),
    });
    onChange(cpVal, val);
  };

  const ref = useRef<HTMLDivElement>(null);

  const pickerValue = value && value.includes("palette:") ? value : cpVal;

  let viewValue = view;
  if (propType === "component" || propType === "root") {
    viewValue = "component";
  } else if (index) {
    viewValue = index;
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    changeProp({
      propKey, index, propItemKey, propType, value: "", setProp, query, actions, nodeId: id,
      ...(propType === "class" && classWriteView != null ? { view: classWriteView, classDark } : {}),
    });
    onChange("", "");
  };

  return (
    <div ref={ref} className="relative">
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
            onClick={() => setIsOpen(prev => !prev)}
          />

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

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1">
          <div className="rounded-lg border border-border bg-card shadow-xl">
            <TokenPicker
              variant="panel"
              value={pickerValue}
              onChange={(data) => { changed(data); }}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
