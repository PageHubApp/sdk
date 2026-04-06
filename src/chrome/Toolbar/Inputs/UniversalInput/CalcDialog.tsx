import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { dropdownPositionToStyle, useDropdownPosition } from "../../hooks/useDropdownPosition";

interface CalcDialogProps {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

export function CalcDialog({ value, onSave, onClose, anchorEl }: CalcDialogProps) {
  const [inputValue, setInputValue] = useState(value);
  const [activeFunction, setActiveFunction] = useState<string>("calc");
  const anchorRef = useRef<HTMLElement | null>(anchorEl);

  // Update ref when anchorEl changes
  useEffect(() => {
    anchorRef.current = anchorEl;
  }, [anchorEl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-calc-dialog]")) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Smart dropdown positioning
  const position = useDropdownPosition({
    isOpen: true,
    anchorRef: anchorRef as React.RefObject<HTMLElement>,
    offset: 6,
    maxHeight: 500,
    minSpaceRequired: 300,
  });

  if (!position) return null;

  const style = {
    ...dropdownPositionToStyle(position),
    width: 400,
  };

  const cssFunction = [
    { id: "calc", label: "calc()", example: "calc(100% - 20px)" },
    { id: "clamp", label: "clamp()", example: "clamp(1rem, 5vw, 3rem)" },
    { id: "min", label: "min()", example: "min(50vw, 500px)" },
    { id: "max", label: "max()", example: "max(50vw, 300px)" },
    { id: "var", label: "var()", example: "var(--primary)" },
  ];

  const insertFunction = (fn: string, example: string) => {
    setActiveFunction(fn);
    if (!inputValue) {
      setInputValue(example);
    }
  };

  return ReactDOM.createPortal(
    <>
      <div role="presentation" aria-hidden="true" className="pointer-events-auto fixed inset-0 z-9999" onClick={onClose} />
      <div style={style} className="pagehub-sdk-root pointer-events-auto z-10000" data-calc-dialog>
        <div className="ph-panel overflow-hidden">
          {/* Header */}
          <div className="border-b border-border bg-muted px-3 py-2">
            <div className="toolbar-label font-semibold">CSS Functions</div>
            <div className="text-xs text-muted-foreground">Use calc, clamp, min, max, or var</div>
          </div>

          {/* Function buttons */}
          <div className="flex gap-1 border-b border-border bg-muted/50 p-2">
            {cssFunction.map(fn => (
              <button
                key={fn.id}
                onClick={() => insertFunction(fn.id, fn.example)}
                className={`rounded px-2 py-1 font-mono text-xs transition-colors ${
                  activeFunction === fn.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {fn.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="p-3">
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="e.g. calc(100% - 20px)"
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
              autoFocus
            />
            <div className="mt-2 text-xs text-muted-foreground">
              Examples: calc(100% - 20px), clamp(1rem, 5vw, 3rem), min(50vw, 500px)
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-border bg-muted/50 p-2">
            <button
              type="button"
              onClick={() => onSave(inputValue)}
              className="btn btn-primary flex-1"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
