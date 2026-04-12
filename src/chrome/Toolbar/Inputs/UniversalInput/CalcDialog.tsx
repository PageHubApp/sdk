import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
import { OVERLAY_Z_CALC_DIALOG } from "../../../overlays/overlayZIndex";
import { useAnchoredPopover } from "../../../overlays/useAnchoredPopover";

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
    value.startsWith("clamp(")
      ? "clamp"
      : value.startsWith("min(")
        ? "min"
        : value.startsWith("max(")
          ? "max"
          : value.startsWith("var(")
            ? "var"
            : "calc"
  );
  const anchorRef = useRef<HTMLElement | null>(anchorEl);

  // Structured fields for clamp/min/max — parse initial value
  const initArgs = parseFunctionArgs(value);
  const isInitClamp = value.startsWith("clamp(") && initArgs.length === 3;
  const isInitMinMax =
    (value.startsWith("min(") || value.startsWith("max(")) && initArgs.length === 2;

  const [clampMin, setClampMin] = useState(
    isInitClamp ? initArgs[0] : isInitMinMax ? initArgs[0] : ""
  );
  const [clampPreferred, setClampPreferred] = useState(isInitClamp ? initArgs[1] : "");
  const [clampMax, setClampMax] = useState(
    isInitClamp ? initArgs[2] : isInitMinMax ? initArgs[1] : ""
  );

  // Update ref when anchorEl changes
  useEffect(() => {
    anchorRef.current = anchorEl;
  }, [anchorEl]);

  const floating = useAnchoredPopover({
    open: true,
    placement: "bottom-start",
    mainAxisOffset: 6,
    maxHeightCeiling: 500,
    maxHeightMin: 150,
    dismiss: { onDismiss: onClose },
  });

  useLayoutEffect(() => {
    floating.refs.setReference(anchorRef.current);
    void floating.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  const style: React.CSSProperties = {
    ...floating.floatingStyles,
    zIndex: OVERLAY_Z_CALC_DIALOG,
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
    <div
      ref={floating.refs.setFloating}
      style={style}
      className="pagehub-sdk-root pointer-events-auto"
      data-calc-dialog
    >
      <div className="ph-panel overflow-hidden">
        {/* Header */}
        <div className="border-base-300 bg-neutral border-b px-3 py-2">
          <div className="toolbar-label font-semibold">CSS Functions</div>
          <div className="text-neutral-content text-xs">Use calc, clamp, min, max, or var</div>
        </div>

        {/* Function buttons */}
        <div className="border-base-300 bg-neutral/50 flex gap-1 border-b p-2">
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
                <label className="text-neutral-content w-16 text-xs">Min</label>
                <input
                  type="text"
                  value={clampMin}
                  onChange={e => setClampMin(e.target.value)}
                  placeholder="1rem"
                  className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:ring-ring flex-1 rounded border px-3 py-2 font-mono text-sm focus:ring-2 focus:outline-none"
                  autoFocus
                  {...toolbarInputNoAutocompleteProps}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-neutral-content w-16 text-xs">Preferred</label>
                <input
                  type="text"
                  value={clampPreferred}
                  onChange={e => setClampPreferred(e.target.value)}
                  placeholder="5vw"
                  className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:ring-ring flex-1 rounded border px-3 py-2 font-mono text-sm focus:ring-2 focus:outline-none"
                  {...toolbarInputNoAutocompleteProps}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-neutral-content w-16 text-xs">Max</label>
                <input
                  type="text"
                  value={clampMax}
                  onChange={e => setClampMax(e.target.value)}
                  placeholder="3rem"
                  className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:ring-ring flex-1 rounded border px-3 py-2 font-mono text-sm focus:ring-2 focus:outline-none"
                  {...toolbarInputNoAutocompleteProps}
                />
              </div>
              <div className="bg-neutral text-neutral-content mt-1 rounded px-3 py-2 font-mono text-xs">
                {buildStructuredValue()}
              </div>
            </div>
          ) : activeFunction === "min" || activeFunction === "max" ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-neutral-content w-16 text-xs">Value A</label>
                <input
                  type="text"
                  value={clampMin}
                  onChange={e => setClampMin(e.target.value)}
                  placeholder={activeFunction === "min" ? "50vw" : "50vw"}
                  className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:ring-ring flex-1 rounded border px-3 py-2 font-mono text-sm focus:ring-2 focus:outline-none"
                  autoFocus
                  {...toolbarInputNoAutocompleteProps}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-neutral-content w-16 text-xs">Value B</label>
                <input
                  type="text"
                  value={clampMax}
                  onChange={e => setClampMax(e.target.value)}
                  placeholder={activeFunction === "min" ? "500px" : "300px"}
                  className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:ring-ring flex-1 rounded border px-3 py-2 font-mono text-sm focus:ring-2 focus:outline-none"
                  {...toolbarInputNoAutocompleteProps}
                />
              </div>
              <div className="bg-neutral text-neutral-content mt-1 rounded px-3 py-2 font-mono text-xs">
                {buildStructuredValue()}
              </div>
            </div>
          ) : (
            <>
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="e.g. calc(100% - 20px)"
                className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:ring-ring w-full rounded border px-3 py-2 font-mono text-sm focus:ring-2 focus:outline-none"
                rows={4}
                autoFocus
                {...toolbarInputNoAutocompleteProps}
              />
              <div className="text-neutral-content mt-2 text-xs">
                Examples: calc(100% - 20px), clamp(1rem, 5vw, 3rem), min(50vw, 500px)
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="border-base-300 bg-neutral/50 flex gap-2 border-t p-2">
          <button
            type="button"
            onClick={() => onSave(buildStructuredValue())}
            className="btn btn-primary flex-1"
          >
            Apply
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
