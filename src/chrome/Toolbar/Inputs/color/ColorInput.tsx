import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { ViewAtom } from "../../../Viewport/atoms";
import { changeProp, getPropFinalValue } from "../../../Viewport/lib";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { usePalette } from "utils/design/PaletteContext";
import { resolveTheme } from "utils/design/resolveTheme";
import {
  cssColorShowsTransparency,
  formatColorForStorage,
  parseColorValue,
  resolveColorForDisplay,
  resolvePaletteReference,
  TRANSPARENT_CHECKER_BG,
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
    showPalette = true,
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
      return resolveTheme(rootNode?.data?.props || {}).palette;
    } catch {
      return [];
    }
  }, [contextPalette, query]);

  const displayValue = resolvePaletteReference(value, prefix);
  const [, cpVal] = parseColorValue(displayValue, prefix);
  const finalStyle = resolveColorForDisplay(displayValue, prefix, palette);
  const hasStoredColor = Boolean(String(value ?? "").trim());
  const fillCss = finalStyle.backgroundColor ?? "";
  const showChecker = !hasStoredColor || cssColorShowsTransparency(fillCss);

  const classWriteView = propType === "class" ? editorCanvasViewToClassPrefixKey(view) : undefined;

  const changed = (data: any) => {
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
      ...(propType === "class" && classWriteView != null
        ? { view: classWriteView, classDark }
        : {}),
    });
    onChange(cpVal, val);
  };

  const ref = useRef<HTMLDivElement>(null);

  const pickerValue = value && value.includes("palette:") ? value : cpVal;

  let viewValue: string | number = view;
  if (propType === "component" || propType === "root") {
    viewValue = "component";
  } else if (index) {
    viewValue = typeof index === "number" ? index : String(index);
  }

  const clearColor = useCallback(() => {
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
      ...(propType === "class" && classWriteView != null
        ? { view: classWriteView, classDark }
        : {}),
    });
    onChange("", "");
    setIsOpen(false);
  }, [
    actions,
    classDark,
    classWriteView,
    id,
    index,
    onChange,
    propItemKey,
    propKey,
    propType,
    query,
    setProp,
  ]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearColor();
  };

  return (
    <div ref={ref} className="relative">
      <Wrap
        props={{ label, labelHide }}
        index={index}
        lab={value}
        viewValue={String(viewValue)}
        propType={propType}
        propKey={propKey}
        propItemKey={propItemKey}
        inline={inline}
        inputWidth={inputWidth}
        labelWidth={labelWidth}
      >
        <div className="relative">
          <div className="color-input-field input-wrapper flex w-full items-stretch">
            <button
              type="button"
              id={`input-${propKey}`}
              className="input-plain relative min-h-8 w-full min-w-0 flex-1 shrink overflow-hidden rounded-lg"
              onClick={() => setIsOpen(prev => !prev)}
              aria-label={label || propKey || "Color"}
            >
              {showChecker && (
                <span
                  className="pointer-events-none absolute inset-0 z-0 rounded-lg"
                  style={TRANSPARENT_CHECKER_BG}
                  aria-hidden
                />
              )}
              {hasStoredColor && (
                <span
                  className="pointer-events-none absolute inset-0 z-[1] rounded-lg"
                  style={{ backgroundColor: fillCss }}
                  aria-hidden
                />
              )}
            </button>
          </div>

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="bg-error text-error-content hover:bg-error/90 absolute -top-1 -right-1 z-10 flex size-4 items-center justify-center rounded-full text-xs font-bold"
              title="Clear color"
            >
              ×
            </button>
          )}
        </div>
      </Wrap>

      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-1">
          <div className="border-base-300 bg-base-200 rounded-lg border shadow-xl">
            <TokenPicker
              variant="panel"
              value={pickerValue}
              onChange={data => {
                changed(data);
              }}
              onClose={() => setIsOpen(false)}
              onClear={clearColor}
            />
          </div>
        </div>
      )}
    </div>
  );
};
