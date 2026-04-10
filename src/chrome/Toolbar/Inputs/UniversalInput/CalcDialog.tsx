import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
import { dropdownPositionToStyle, useDropdownPosition } from "../../hooks/useDropdownPosition";

interface CalcDialogProps {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

/** Parse clamp(a, b, c) or min(a, b) / max(a, b) into parts */
function parseFunctionArgs(val: string): string[] {
  const match = val.match(/^(?:clamp|min|max)\((.+)\)$/);
  if (!match) return [];
  return match[1].split(",").map(s => s.trim());
}

export function CalcDialog({ value, onSave, onClose, anchorEl }: CalcDialogProps) {
  const [inputValue, setInputValue] = useState(value);
  const [activeFunction, setActiveFunction] = useState<string>(
    value.startsWith("clamp(") ? "clamp" :
    value.startsWith("min(") ? "min" :
    value.startsWith("max(") ? "max" :
    value.startsWith("var(") ? "var" : "calc"
  );
  const anchorRef = useRef<HTMLElement | null>(anchorEl);

  // Structured fields for clamp/min/max — parse initial value
  const initArgs = parseFunctionArgs(value);
  const isInitClamp = value.startsWith("clamp(") && initArgs.length === 3;
  const isInitMinMax = (value.startsWith("min(") || value.startsWith("max(")) && initArgs.length === 2;

  const [clampMin, setClampMin] = useState(isInitClamp ? initArgs[0] : isInitMinMax ? initArgs[0] : "");
  const [clampPreferred, setClampPreferred] = useState(isInitClamp ? initArgs[1] : "");
  const [clampMax, setClampMax] = useState(isInitClamp ? initArgs[2] : isInitMinMax ? initArgs[1] : "");

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

    if (fn === "clamp") {
      const args = parseFunctionArgs(inputValue);
      if (args.length === 3) {
        setClampMin(args[0]);
        setClampPreferred(args[1]);
        setClampMax(args[2]);
      } else if (!clampMin && !clampPreferred && !clampMax) {
        setClampMin("1rem");
        setClampPreferred("5vw");
        setClampMax("3rem");
      }
    } else if (fn === "min" || fn === "max") {
      const args = parseFunctionArgs(inputValue);
      if (args.length === 2) {
        setClampMin(args[0]);
        setClampMax(args[1]);
      } else if (!clampMin && !clampMax) {
        setClampMin(fn === "min" ? "50vw" : "50vw");
        setClampMax(fn === "min" ? "500px" : "300px");
      }
    } else if (!inputValue) {
      setInputValue(example);
    }
  };

  const buildStructuredValue = () => {
    if (activeFunction === "clamp") {
      return `clamp(${clampMin}, ${clampPreferred}, ${clampMax})`;
    }
    if (activeFunction === "min" || activeFunction === "max") {
      return `${activeFunction}(${clampMin}, ${clampMax})`;
    }
    return inputValue;
  };

  return ReactDOM.createPortal(
    <>
      <div role="presentation" aria-hidden="true" className="pointer-events-auto fixed inset-0 z-9999" onClick={onClose} />
      <div style={style} className="pagehub-sdk-root pointer-events-auto z-10000" data-calc-dialog>
        <div className="ph-panel overflow-hidden">
          {/* Header */}
          <div className="border-b border-base-300 bg-neutral px-3 py-2">
            <div className="toolbar-label font-semibold">CSS Functions</div>
            <div className="text-xs text-neutral-content">Use calc, clamp, min, max, or var</div>
          </div>

          {/* Function buttons */}
          <div className="flex gap-1 border-b border-base-300 bg-neutral/50 p-2">
            {cssFunction.map(fn => (
              <button
                key={fn.id}
                onClick={() => insertFunction(fn.id, fn.example)}
                className={`rounded px-2 py-1 font-mono text-xs transition-colors ${
                  activeFunction === fn.id
                    ? "bg-primary text-primary-content"
                    : "bg-base-100 text-base-content hover:bg-neutral"
                }`}
              >
                {fn.label}
              </button>
            ))}
          </div>

          {/* Input area — structured for clamp/min/max, textarea for calc/var */}
          <div className="p-3">
            {activeFunction === "clamp" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="w-16 text-xs text-neutral-content">Min</label>
                  <input
                    type="text"
                    value={clampMin}
                    onChange={e => setClampMin(e.target.value)}
                    placeholder="1rem"
                    className="flex-1 rounded border border-base-300 bg-base-200 px-3 py-2 font-mono text-sm text-base-content placeholder:text-neutral-content focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                    {...toolbarInputNoAutocompleteProps}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-16 text-xs text-neutral-content">Preferred</label>
                  <input
                    type="text"
                    value={clampPreferred}
                    onChange={e => setClampPreferred(e.target.value)}
                    placeholder="5vw"
                    className="flex-1 rounded border border-base-300 bg-base-200 px-3 py-2 font-mono text-sm text-base-content placeholder:text-neutral-content focus:outline-none focus:ring-2 focus:ring-ring"
                    {...toolbarInputNoAutocompleteProps}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-16 text-xs text-neutral-content">Max</label>
                  <input
                    type="text"
                    value={clampMax}
                    onChange={e => setClampMax(e.target.value)}
                    placeholder="3rem"
                    className="flex-1 rounded border border-base-300 bg-base-200 px-3 py-2 font-mono text-sm text-base-content placeholder:text-neutral-content focus:outline-none focus:ring-2 focus:ring-ring"
                    {...toolbarInputNoAutocompleteProps}
                  />
                </div>
                <div className="mt-1 rounded bg-neutral px-3 py-2 font-mono text-xs text-neutral-content">
                  {buildStructuredValue()}
                </div>
              </div>
            ) : activeFunction === "min" || activeFunction === "max" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="w-16 text-xs text-neutral-content">Value A</label>
                  <input
                    type="text"
                    value={clampMin}
                    onChange={e => setClampMin(e.target.value)}
                    placeholder={activeFunction === "min" ? "50vw" : "50vw"}
                    className="flex-1 rounded border border-base-300 bg-base-200 px-3 py-2 font-mono text-sm text-base-content placeholder:text-neutral-content focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                    {...toolbarInputNoAutocompleteProps}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-16 text-xs text-neutral-content">Value B</label>
                  <input
                    type="text"
                    value={clampMax}
                    onChange={e => setClampMax(e.target.value)}
                    placeholder={activeFunction === "min" ? "500px" : "300px"}
                    className="flex-1 rounded border border-base-300 bg-base-200 px-3 py-2 font-mono text-sm text-base-content placeholder:text-neutral-content focus:outline-none focus:ring-2 focus:ring-ring"
                    {...toolbarInputNoAutocompleteProps}
                  />
                </div>
                <div className="mt-1 rounded bg-neutral px-3 py-2 font-mono text-xs text-neutral-content">
                  {buildStructuredValue()}
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="e.g. calc(100% - 20px)"
                  className="w-full rounded border border-base-300 bg-base-200 px-3 py-2 font-mono text-sm text-base-content placeholder:text-neutral-content focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={4}
                  autoFocus
                  {...toolbarInputNoAutocompleteProps}
                />
                <div className="mt-2 text-xs text-neutral-content">
                  Examples: calc(100% - 20px), clamp(1rem, 5vw, 3rem), min(50vw, 500px)
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-base-300 bg-neutral/50 p-2">
            <button
              type="button"
              onClick={() => onSave(buildStructuredValue())}
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
