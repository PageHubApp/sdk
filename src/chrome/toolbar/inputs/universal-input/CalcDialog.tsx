/**
 * CalcDialog — composes a CSS function value (calc / clamp / min / max / var)
 * for a UniversalInput.
 *
 * Modern popover treatment via `FloatingPanel` (matches Action /
 * Conditions / Effects editors). Click the `fx` chip on a UniversalInput →
 * panel opens anchored to the chip's position (via `initialPosition`);
 * X / Esc / outside click closes it; Apply writes the composed value back.
 *
 * Per-function bodies:
 *   - `calc` / `var` — free-form textarea
 *   - `clamp`        — Min / Preferred / Max rows + live preview
 *   - `min` / `max`  — Value A / Value B rows + live preview
 */
import { useMemo, useState } from "react";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { Chip } from "../../../primitives/Chip";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";

interface CalcDialogProps {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

// Anchor-positioning hint only — the panel itself uses `autoSize` so width
// hugs content (calc/var have a textarea; clamp/min/max have small rows).
const PANEL_WIDTH_HINT = 320;

const CSS_FUNCTIONS = [
  { id: "calc", label: "calc()", example: "calc(100% - 20px)" },
  { id: "clamp", label: "clamp()", example: "clamp(1rem, 5vw, 3rem)" },
  { id: "min", label: "min()", example: "min(50vw, 500px)" },
  { id: "max", label: "max()", example: "max(50vw, 300px)" },
  { id: "var", label: "var()", example: "var(--primary)" },
] as const;

type FnId = (typeof CSS_FUNCTIONS)[number]["id"];

function detectFunction(val: string): FnId {
  if (val.startsWith("clamp(")) return "clamp";
  if (val.startsWith("min(")) return "min";
  if (val.startsWith("max(")) return "max";
  if (val.startsWith("var(")) return "var";
  return "calc";
}

/** Parse `clamp(a, b, c)` or `min(a, b)` / `max(a, b)` into trimmed parts. */
function parseFunctionArgs(val: string): string[] {
  const match = val.match(/^(?:clamp|min|max)\((.+)\)$/);
  if (!match) return [];
  return match[1].split(",").map(s => s.trim());
}

function computeInitialPosition(
  anchorEl: HTMLElement | null,
  panelWidth: number
): { x: number; y: number } | undefined {
  if (typeof window === "undefined" || !anchorEl) return undefined;
  const rect = anchorEl.getBoundingClientRect();
  const x = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - panelWidth - 8));
  const y = Math.max(8, rect.bottom + 6);
  return { x, y };
}

export function CalcDialog({ value, onSave, onClose, anchorEl }: CalcDialogProps) {
  const [activeFunction, setActiveFunction] = useState<FnId>(() => detectFunction(value));
  const [inputValue, setInputValue] = useState(value);

  // Structured fields for clamp / min / max — seed from the incoming value
  // when it parses, otherwise empty.
  const initArgs = useMemo(() => parseFunctionArgs(value), [value]);
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

  const initialPosition = useMemo(
    () => computeInitialPosition(anchorEl, PANEL_WIDTH_HINT),
    [anchorEl]
  );

  const insertFunction = (fn: FnId, example: string) => {
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
        setClampMin("50vw");
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

  const apply = () => onSave(buildStructuredValue());
  const previewValue = buildStructuredValue();

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="CSS Function"
      storageKey="calc-dialog"
      minWidth={280}
      maxWidth={520}
      maxHeight={Math.round(typeof window !== "undefined" ? window.innerHeight * 0.8 : 520)}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <div className="flex flex-col gap-3">
        {/* Function picker — segmented row, mirrors the AND/OR toggle in
            ConditionsInput.tsx:407-431 so it reads as one consistent
            primitive across the editor. */}
        <div className="bg-neutral flex gap-0.5 rounded-md p-0.5">
          {CSS_FUNCTIONS.map(fn => (
            <button
              key={fn.id}
              type="button"
              onClick={() => insertFunction(fn.id, fn.example)}
              className={`flex-1 rounded px-2 py-1 font-mono text-[11px] transition-colors ${
                activeFunction === fn.id
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-neutral-content hover:text-base-content"
              }`}
            >
              {fn.label}
            </button>
          ))}
        </div>

        {activeFunction === "clamp" ? (
          <div className="flex flex-col gap-1.5">
            <ClampField
              label="Min"
              value={clampMin}
              onChange={setClampMin}
              placeholder="1rem"
              autoFocus
            />
            <ClampField
              label="Preferred"
              value={clampPreferred}
              onChange={setClampPreferred}
              placeholder="5vw"
            />
            <ClampField label="Max" value={clampMax} onChange={setClampMax} placeholder="3rem" />
          </div>
        ) : activeFunction === "min" || activeFunction === "max" ? (
          <div className="flex flex-col gap-1.5">
            <ClampField
              label="Value A"
              value={clampMin}
              onChange={setClampMin}
              placeholder="50vw"
              autoFocus
            />
            <ClampField
              label="Value B"
              value={clampMax}
              onChange={setClampMax}
              placeholder={activeFunction === "min" ? "500px" : "300px"}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={
                activeFunction === "var" ? "e.g. var(--primary)" : "e.g. calc(100% - 20px)"
              }
              className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:border-primary w-full rounded-md border px-2 py-1.5 font-mono text-xs outline-none focus:ring-0"
              rows={4}
              autoFocus
              {...toolbarInputNoAutocompleteProps}
            />
            <p className="text-neutral-content text-[10px] leading-snug">
              Examples: calc(100% - 20px), clamp(1rem, 5vw, 3rem), min(50vw, 500px)
            </p>
          </div>
        )}

        <div className="bg-neutral text-neutral-content overflow-x-auto rounded-md px-2 py-1.5 font-mono text-[11px]">
          {previewValue || "—"}
        </div>

        <button
          type="button"
          onClick={apply}
          className="btn btn-primary btn-sm w-full font-semibold"
        >
          Apply
        </button>
      </div>
    </FloatingPanel>
  );
}

function ClampField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <Chip label={label}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-full w-full bg-transparent px-1 font-mono text-xs outline-none"
        {...toolbarInputNoAutocompleteProps}
      />
    </Chip>
  );
}
