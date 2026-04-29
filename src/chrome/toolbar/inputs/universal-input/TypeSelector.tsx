import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { OVERLAY_Z_TYPE_SELECTOR } from "../../../overlays/overlayZIndex";
import { useAnchoredPopover } from "../../../overlays/useAnchoredPopover";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";
import { ValueType } from "./types";

interface TypeSelectorProps {
  types: { id: ValueType; label: string | React.ReactNode }[];
  selectedType: ValueType;
  onTypeChange: (type: ValueType) => void;
  onCalcClick?: () => void;
  onOpenChange?: (isOpen: boolean) => void;
}

function getTypeTooltip(type: ValueType): string {
  switch (type) {
    case "calc":
      return "Formula (calc)";
    case "var":
      return "Design token / variable";
    case "tailwind":
      return "Tailwind class";
    case "px":
      return "Pixels (px)";
    case "em":
      return "Relative to font size (em)";
    case "rem":
      return "Relative to root font size (rem)";
    case "%":
      return "Percentage (%)";
    case "vh":
      return "Viewport height (vh)";
    case "vw":
      return "Viewport width (vw)";
    case "vmin":
      return "Viewport minimum (vmin)";
    case "vmax":
      return "Viewport maximum (vmax)";
    default:
      return String(type);
  }
}

function tooltipPlaceForIndex(index: number): "left" | "bottom" | "right" {
  const col = index % 3;
  if (col === 0) return "left";
  if (col === 2) return "right";
  return "bottom";
}

export const TypeSelector = React.forwardRef<HTMLDivElement, TypeSelectorProps>(
  ({ types, selectedType, onTypeChange, onOpenChange }, forwardedRef) => {
    const [isOpen, setIsOpen] = useState(false);
    const hoverOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearHoverOpenTimer = useCallback(() => {
      if (!hoverOpenTimerRef.current) return;
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }, []);

    const clearHoverCloseTimer = useCallback(() => {
      if (!hoverCloseTimerRef.current) return;
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }, []);

    const handleMouseEnter = useCallback(() => {
      clearHoverCloseTimer();
      clearHoverOpenTimer();
      hoverOpenTimerRef.current = setTimeout(() => {
        setIsOpen(true);
        hoverOpenTimerRef.current = null;
      }, 400);
    }, [clearHoverCloseTimer, clearHoverOpenTimer]);

    const handleMouseLeave = useCallback(() => {
      clearHoverOpenTimer();
      clearHoverCloseTimer();
      hoverCloseTimerRef.current = setTimeout(() => {
        setIsOpen(false);
        hoverCloseTimerRef.current = null;
      }, 280);
    }, [clearHoverCloseTimer, clearHoverOpenTimer]);

    useEffect(
      () => () => {
        clearHoverOpenTimer();
        clearHoverCloseTimer();
      },
      [clearHoverOpenTimer, clearHoverCloseTimer]
    );

    useEffect(() => {
      onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);

    const internalRef = useRef<HTMLDivElement>(null);

    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [forwardedRef]
    );

    const floating = useAnchoredPopover({
      open: isOpen,
      placement: "bottom-end",
      mainAxisOffset: 4,
      maxHeightCeiling: 300,
      maxHeightMin: 0,
      dismiss: {
        onDismiss: () => setIsOpen(false),
      },
    });

    const setRootRef = useCallback(
      (node: HTMLDivElement | null) => {
        mergedRef(node);
        floating.refs.setReference(node);
      },
      [mergedRef, floating.refs]
    );

    useLayoutEffect(() => {
      if (isOpen) void floating.update();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const selectedLabel = types.find(t => t.id === selectedType)?.label || "?";

    return (
      <>
        <div
          ref={setRootRef}
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-base-200 flex h-5 items-center gap-0 rounded-md">
            <button
              onClick={e => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="text-neutral-content hover:text-base-content flex min-w-5 items-center justify-center p-0 text-[9px] font-medium"
              {...(!isOpen
                ? {
                    "data-tooltip-id": PAGEHUB_RTT_GLOBAL_ID,
                    "data-tooltip-content": "Change type",
                    "data-tooltip-place": "bottom" as const,
                  }
                : {})}
            >
              {selectedLabel}
            </button>
          </div>
        </div>

        {isOpen &&
          ReactDOM.createPortal(
            <div
              data-type-selector-dropdown
              ref={floating.refs.setFloating}
              style={{
                ...floating.floatingStyles,
                zIndex: OVERLAY_Z_TYPE_SELECTOR,
              }}
              className="pagehub-sdk-root scrollbar-light ph-panel-soft pointer-events-auto grid min-w-32 grid-cols-3 gap-1 overflow-hidden p-0.5"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {types.map((type, index) => (
                <button
                  key={type.id}
                  onClick={() => {
                    onTypeChange(type.id);
                    setIsOpen(false);
                  }}
                  className={`hover:bg-neutral flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs ${
                    selectedType === type.id ? "bg-neutral font-semibold" : ""
                  }`}
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content={getTypeTooltip(type.id)}
                  data-tooltip-place={tooltipPlaceForIndex(index)}
                >
                  {type.label}
                </button>
              ))}
            </div>,
            document.querySelector(".pagehub-sdk-root") || document.body
          )}
      </>
    );
  }
);

TypeSelector.displayName = "TypeSelector";
