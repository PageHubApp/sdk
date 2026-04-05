// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { dropdownPositionToStyle, useDropdownPosition } from "../../hooks/useDropdownPosition";
import { ValueType } from "./types";

interface TypeSelectorProps {
  types: { id: ValueType; label: string | React.ReactNode }[];
  selectedType: ValueType;
  onTypeChange: (type: ValueType) => void;
  onCalcClick?: () => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export const TypeSelector = React.forwardRef<HTMLDivElement, TypeSelectorProps>(
  ({ types, selectedType, onTypeChange, onCalcClick, onOpenChange }, forwardedRef) => {
    const [isOpen, setIsOpen] = useState(false);

    // Notify parent when dropdown opens/closes
    useEffect(() => {
      onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);
    const internalRef = useRef<HTMLDivElement>(null);

    // Merge refs
    const mergedRef = React.useCallback(
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

    // Smart dropdown positioning - align to right
    const position = useDropdownPosition({
      isOpen,
      anchorRef: internalRef as React.RefObject<HTMLElement>,
      offset: 4,
      maxHeight: 300,
      minSpaceRequired: 100,
      align: "right",
    });

    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Element;
        // Check if click is outside both the button and the dropdown
        if (
          internalRef.current &&
          !internalRef.current.contains(e.target as Node) &&
          !target.closest("[data-type-selector-dropdown]")
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const selectedLabel = types.find(t => t.id === selectedType)?.label || "?";

    return (
      <>
        <div ref={mergedRef} className="relative">
          <div className="flex h-5 items-center gap-0 rounded-md bg-background">
            {/* Icon/Label part - opens calc dialog when calc is selected */}
            <button
              onClick={e => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="flex min-w-5 items-center justify-center p-0 text-[9px] font-medium text-muted-foreground hover:text-foreground"
              title={"Change type selector"}
            >
              {selectedLabel}
            </button>
          </div>
        </div>

        {isOpen &&
          position &&
          ReactDOM.createPortal(
            <div
              data-type-selector-dropdown
              style={dropdownPositionToStyle(position)}
              className="scrollbar pointer-events-auto grid min-w-32 grid-cols-3 gap-1 overflow-hidden rounded-lg border border-border bg-background p-0.5 shadow-lg"
            >
              {types.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    onTypeChange(type.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs hover:bg-muted ${
                    selectedType === type.id ? "bg-muted font-semibold" : ""
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
