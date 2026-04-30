/**
 * TextStyleEditorPanel — heavy lazy chunk: FloatingPanel containing the
 * editor for a single typography preset. Used in two modes:
 *   - "new"  → seeded from the current node's captured DOM typography.
 *   - "edit" → seeded from an existing preset; "Delete" removes it.
 *
 * Inputs write to a local draft via `useState`; nothing touches the editor
 * theme until the user clicks Save. This is the "smallest adapter" between
 * the existing DOM-bound primitives (which write className via changeProp +
 * useNode) and the preset definition stored in `ROOT.props.theme.typography`.
 *
 * Reuses the atom-driven font + color picker dialogs (no host coupling).
 */
import { useAtomState } from "@zedux/react";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { TbChevronDown, TbTrash } from "react-icons/tb";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { ToolbarDropdown } from "@/chrome/toolbar/ToolbarDropdown";
import { ColorPickerAtom } from "@/chrome/toolbar/dialogs/ColorPickerDialog";
import { FontFamilyDialogAtom } from "@/chrome/toolbar/dialogs/FontFamilyDialog";
import { ToolbarSegmentedControl } from "@/chrome/toolbar/helpers/ToolbarSegmentedControl";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../overlays/overlayZIndex";
import type { TextStyleDraft } from "./textStyleDraft";

export type { TextStyleDraft } from "./textStyleDraft";
export { emptyDraft, presetToDraft } from "./textStyleDraft";

export type TextStyleEditorMode = "new" | "edit";

interface PanelProps {
  mode: TextStyleEditorMode;
  /** Seed values for the draft. For "edit" mode this is the preset being edited. */
  initialDraft: TextStyleDraft;
  /** Used only in edit mode — the preset name BEFORE this edit (for rename / collision detection). */
  originalName: string | null;
  /** All existing preset names — used to detect duplicates. */
  existingNames: string[];
  initialPosition?: { x: number; y: number };
  defaultWidth: number;
  defaultHeight: number;
  onClose: () => void;
  onSave: (draft: TextStyleDraft) => void;
  onDelete?: () => void;
}

const FONT_SIZE_OPTIONS = [
  ["0.625rem", "XS (10px)"],
  ["0.75rem", "SM (12px)"],
  ["0.875rem", "Base- (14px)"],
  ["1rem", "Base (16px)"],
  ["1.125rem", "LG (18px)"],
  ["1.25rem", "XL (20px)"],
  ["1.5rem", "2XL (24px)"],
  ["1.875rem", "3XL (30px)"],
  ["2.25rem", "4XL (36px)"],
  ["3rem", "5XL (48px)"],
  ["3.75rem", "6XL (60px)"],
  ["4.5rem", "7XL (72px)"],
  ["6rem", "8XL (96px)"],
  ["8rem", "9XL (128px)"],
];

const FONT_WEIGHT_OPTIONS = [
  ["100", "Thin"],
  ["200", "Extra Light"],
  ["300", "Light"],
  ["400", "Normal"],
  ["500", "Medium"],
  ["600", "Semibold"],
  ["700", "Bold"],
  ["800", "Extra Bold"],
  ["900", "Black"],
];

const LINE_HEIGHT_OPTIONS = [
  ["1", "None"],
  ["1.15", "Tight"],
  ["1.2", "Snug"],
  ["1.25", "Compact"],
  ["1.375", "Normal-"],
  ["1.5", "Normal"],
  ["1.625", "Relaxed"],
  ["1.75", "Loose"],
  ["2", "Extra"],
];

const LETTER_SPACING_OPTIONS = [
  ["-0.05em", "Tighter"],
  ["-0.025em", "Tight"],
  ["normal", "Normal"],
  ["0.025em", "Wide"],
  ["0.05em", "Wider"],
  ["0.1em", "Widest"],
];

const TRANSFORM_OPTIONS = [
  ["none", "None"],
  ["uppercase", "UPPERCASE"],
  ["lowercase", "lowercase"],
  ["capitalize", "Capitalize"],
];

const DECORATION_OPTIONS = [
  ["none", "None"],
  ["underline", "Underline"],
  ["line-through", "Strikethrough"],
  ["overline", "Overline"],
];

const TEXT_ALIGN_OPTIONS: Array<{ value: string; label: string; tooltip?: string }> = [
  { value: "left", label: "L", tooltip: "Left" },
  { value: "center", label: "C", tooltip: "Center" },
  { value: "right", label: "R", tooltip: "Right" },
  { value: "justify", label: "J", tooltip: "Justify" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-neutral-content mb-1 block text-[11px] font-medium">{children}</label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[][];
  id: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <ToolbarDropdown value={value} onChange={onChange} placeholder={label} propKey={id}>
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>
            {lbl}
          </option>
        ))}
      </ToolbarDropdown>
    </div>
  );
}

function normalizeColorValue(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.value === "string") return o.value;
    if (
      typeof (o as any).r === "number" &&
      typeof (o as any).g === "number" &&
      typeof (o as any).b === "number"
    ) {
      const a = typeof (o as any).a === "number" ? (o as any).a : 1;
      return `rgba(${(o as any).r}, ${(o as any).g}, ${(o as any).b}, ${a})`;
    }
  }
  return String(raw);
}

export default function TextStyleEditorPanel({
  mode,
  initialDraft,
  originalName,
  existingNames,
  initialPosition,
  defaultWidth,
  defaultHeight,
  onClose,
  onSave,
  onDelete,
}: PanelProps) {
  const [draft, setDraft] = useState<TextStyleDraft>(initialDraft);
  const fontButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const [, setFontDialog] = useAtomState(FontFamilyDialogAtom);
  const [, setColorDialog] = useAtomState(ColorPickerAtom);

  const update = <K extends keyof TextStyleDraft>(key: K, value: TextStyleDraft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const trimmed = draft.name.trim();
  const nameError = useMemo(() => {
    if (!trimmed) return "Name is required";
    const lower = trimmed.toLowerCase();
    const collides = existingNames.some(n => n.toLowerCase() === lower && n !== originalName);
    if (collides) return `A style named "${trimmed}" already exists`;
    return null;
  }, [trimmed, existingNames, originalName]);

  const canSave = !nameError;

  const openFontPicker = () => {
    const rect = fontButtonRef.current?.getBoundingClientRect() || null;
    setFontDialog({
      enabled: true,
      value: draft.fontFamily ? [draft.fontFamily] : [],
      originalValue: draft.fontFamily ? [draft.fontFamily] : [],
      changed: (value: unknown) => {
        const fam = Array.isArray(value) ? (value as string[])[0] : (value as string);
        update("fontFamily", fam || "");
      },
      preview: (value: unknown) => {
        const fam = Array.isArray(value) ? (value as string[])[0] : (value as string);
        update("fontFamily", fam || "");
      },
      e: rect,
    });
  };

  const openColorPicker = () => {
    const rect = colorButtonRef.current?.getBoundingClientRect() || null;
    setColorDialog({
      enabled: true,
      value: draft.color || "",
      prefix: "",
      changed: (value: unknown) => {
        const v = normalizeColorValue(value);
        if (v != null) update("color", v);
      },
      e: rect,
      mode: "picker",
      propKey: "text-style-editor-color",
    });
  };

  const previewStyle: CSSProperties = {
    fontFamily: draft.fontFamily || "inherit",
    fontSize: draft.fontSize || "1rem",
    fontWeight: draft.fontWeight || "400",
    lineHeight: draft.lineHeight || "1.5",
    letterSpacing: draft.letterSpacing || "normal",
    textTransform: (draft.textTransform || "none") as CSSProperties["textTransform"],
    color: draft.color || undefined,
    textDecoration:
      draft.textDecoration && draft.textDecoration !== "none" ? draft.textDecoration : undefined,
    textAlign: (draft.textAlign || "left") as CSSProperties["textAlign"],
  };

  const titleNode = mode === "new" ? "New Text Style" : `Edit · ${originalName ?? draft.name}`;

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title={titleNode}
      storageKey="text-style-editor"
      autoSize={false}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={300}
      maxWidth={520}
      minHeight={420}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
      bodyClassName="text-base-content flex flex-col gap-3 p-3 text-xs"
    >
      <div>
        <FieldLabel>Name</FieldLabel>
        <input
          type="text"
          value={draft.name}
          onChange={e => update("name", e.target.value)}
          placeholder="e.g. Heading 2"
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "text-style-name-error" : undefined}
          className={`input-plain border-base-300 bg-base-100 w-full rounded-md border px-2 py-1.5 text-xs outline-none ${
            nameError ? "border-error focus:border-error" : "focus:border-primary"
          }`}
        />
        {nameError && (
          <p
            id="text-style-name-error"
            role="alert"
            className="text-error mt-1 text-[11px] leading-tight"
          >
            {nameError}
          </p>
        )}
      </div>

      <div>
        <FieldLabel>Font Family</FieldLabel>
        <button
          type="button"
          ref={fontButtonRef}
          onClick={openFontPicker}
          className="border-base-300 bg-base-100 text-base-content hover:bg-base-200 flex h-8 w-full items-center justify-between gap-2 rounded-md border px-2 text-left text-xs"
          style={{ fontFamily: draft.fontFamily || undefined }}
        >
          <span className="truncate">{draft.fontFamily || "Choose typeface…"}</span>
          <TbChevronDown className="text-neutral-content size-3 shrink-0" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SelectField
          id="text-style-size"
          label="Size"
          value={draft.fontSize}
          onChange={v => update("fontSize", v)}
          options={FONT_SIZE_OPTIONS}
        />
        <SelectField
          id="text-style-weight"
          label="Weight"
          value={draft.fontWeight}
          onChange={v => update("fontWeight", v)}
          options={FONT_WEIGHT_OPTIONS}
        />
        <SelectField
          id="text-style-line-height"
          label="Line Height"
          value={draft.lineHeight}
          onChange={v => update("lineHeight", v)}
          options={LINE_HEIGHT_OPTIONS}
        />
        <SelectField
          id="text-style-letter-spacing"
          label="Letter Spacing"
          value={draft.letterSpacing}
          onChange={v => update("letterSpacing", v)}
          options={LETTER_SPACING_OPTIONS}
        />
        <SelectField
          id="text-style-transform"
          label="Transform"
          value={draft.textTransform}
          onChange={v => update("textTransform", v)}
          options={TRANSFORM_OPTIONS}
        />
        <SelectField
          id="text-style-decoration"
          label="Decoration"
          value={draft.textDecoration}
          onChange={v => update("textDecoration", v)}
          options={DECORATION_OPTIONS}
        />
      </div>

      <div>
        <FieldLabel>Text Align</FieldLabel>
        <ToolbarSegmentedControl
          value={draft.textAlign}
          onChange={v => update("textAlign", v)}
          options={TEXT_ALIGN_OPTIONS}
          aria-label="Text alignment"
        />
      </div>

      <div>
        <FieldLabel>Color</FieldLabel>
        <button
          type="button"
          ref={colorButtonRef}
          onClick={openColorPicker}
          className="border-base-300 bg-base-100 text-base-content hover:bg-base-200 flex h-8 w-full items-center gap-2 rounded-md border px-2 text-left text-xs"
        >
          <span
            className="border-base-300 size-4 shrink-0 rounded border"
            style={{ backgroundColor: draft.color || "transparent" }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">{draft.color || "Inherit"}</span>
          {draft.color && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => {
                e.stopPropagation();
                update("color", "");
              }}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  update("color", "");
                }
              }}
              className="text-neutral-content hover:text-base-content shrink-0 px-1"
              aria-label="Clear color"
            >
              ×
            </span>
          )}
        </button>
      </div>

      <div className="border-base-300/60 bg-base-200/40 rounded-md border p-3">
        <p className="text-base-content/45 mb-1 text-[10px] font-semibold tracking-wider uppercase">
          Preview
        </p>
        <div style={previewStyle} className="break-words">
          The quick brown fox jumps over the lazy dog
        </div>
      </div>

      <div className="border-base-300/60 mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <div>
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-error hover:bg-error/10 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            >
              <TbTrash className="size-3.5" aria-hidden />
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-base-content hover:bg-base-200 rounded-md px-3 py-1 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              onSave({ ...draft, name: trimmed });
            }}
            className="bg-primary text-primary-content rounded-md px-3 py-1 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === "new" ? "Save as new" : "Update"}
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}
