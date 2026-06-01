import { ROOT_NODE } from "@craftjs/utils";
import { useEditor, useNode } from "@craftjs/core";
import { ViewAtom } from "../../../viewport/state/atoms";
import { changeProp, getPropFinalValue } from "../../../viewport/state/viewportExports";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAtomValue } from "@zedux/react";
import { usePalette } from "@/utils/design/PaletteContext";
import { resolveTheme } from "@/utils/design/resolveTheme";
import {
  cssColorShowsTransparency,
  formatColorForStorage,
  parseColorValue,
  resolveColorForDisplay,
  resolvePaletteReference,
  TRANSPARENT_CHECKER_BG,
} from "@/utils/design/color";
import { editorCanvasViewToClassPrefixKey } from "@/utils/tailwind/className";
import { EditModifiersAtom } from "../../Label";
import { Chip } from "@/chrome/primitives/Chip";
import { TokenPicker } from "./TokenPicker";
import { InlineClearButton } from "../../../primitives/InlineClearButton";
import { useRegisterFloatingPanelPortal } from "../../../floating/FloatingPanel";
import type { ReactNode } from "react";

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
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Recompute popover position when opening (and on scroll/resize while open).
  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPopoverPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(EditModifiersAtom).dark ?? false;

  const { actions, query } = useEditor();

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data?.props || {},
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

  const swatchLabel = useMemo(() => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const m = raw.match(/palette:(.+)$/);
    if (m) return m[1];
    return raw;
  }, [value]);

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
      <Chip
        variant="swatch"
        label={labelHide ? undefined : label}
        onLabelClick={() => setIsOpen(prev => !prev)}
        index={index}
        propType={propType}
        propKey={propKey}
        propItemKey={propItemKey}
        labelWidth={labelWidth}
        trailing={value ? <InlineClearButton onClick={handleClear} tooltip="Clear color" /> : null}
      >
        <button
          ref={triggerRef}
          type="button"
          id={`input-${propKey}`}
          className="relative h-full w-full min-w-0 flex-1 shrink rounded-none"
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={label || propKey || "Color"}
        >
          {showChecker && (
            <span
              className="pointer-events-none absolute inset-0 z-0"
              style={TRANSPARENT_CHECKER_BG}
              aria-hidden
            />
          )}
          {hasStoredColor && (
            <span
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{ backgroundColor: fillCss }}
              aria-hidden
            />
          )}
          {swatchLabel && (
            <span
              className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center px-2 text-[11px] font-medium tracking-tight text-white"
              style={{ mixBlendMode: "difference" }}
            >
              <span className="block max-w-full truncate">{swatchLabel}</span>
            </span>
          )}
        </button>
      </Chip>

      {isOpen && popoverPos && (
        <ColorPickerPortal top={popoverPos.top} right={popoverPos.right}>
          <div className="border-base-300 bg-base-200 rounded-xl border shadow-xl">
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
        </ColorPickerPortal>
      )}
    </div>
  );
};

function ColorPickerPortal({
  top,
  right,
  children,
}: {
  top: number;
  right: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useRegisterFloatingPanelPortal(ref);
  return createPortal(
    <div ref={ref} className="pagehub-sdk-root fixed z-[1200]" style={{ top, right }}>
      {children}
    </div>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
