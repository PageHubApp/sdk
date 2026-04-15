import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { OVERLAY_Z_TYPE_SELECTOR } from "../../../overlays/overlayZIndex";
import { useAnchoredPopover } from "../../../overlays/useAnchoredPopover";
import { ValueType } from "./types";

interface TypeSelectorProps {
  types: { id: ValueType; label: string | React.ReactNode }[];
  selectedType: ValueType;
  onTypeChange: (type: ValueType) => void;
  onCalcClick?: () => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export const TypeSelector = React.forwardRef<HTMLDivElement, TypeSelectorProps>(
  ({ types, selectedType, onTypeChange, onOpenChange }, forwardedRef) => {
    const [isOpen, setIsOpen] = useState(false);

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
        <div ref={setRootRef} className="relative">
          <div className="bg-base-200 flex h-5 items-center gap-0 rounded-md">
            <button
              onClick={e => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="text-neutral-content hover:text-base-content flex min-w-5 items-center justify-center p-0 text-[9px] font-medium"
              title={"Change type selector"}
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
            >
              {types.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    onTypeChange(type.id);
                    setIsOpen(false);
                  }}
                  className={`hover:bg-neutral flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs ${
                    selectedType === type.id ? "bg-neutral font-semibold" : ""
                  }`}
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
