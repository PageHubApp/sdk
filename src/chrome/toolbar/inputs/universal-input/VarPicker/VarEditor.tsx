/**
 * VarEditor — create / edit stage of the VarPicker. Handles styleGuide tokens
 * only (palette + typography use their existing dedicated CRUD UIs).
 *
 * Form shape varies by token kind:
 * - Built-in styleGuide → name + type + appliesTo are LOCKED. Only value editable.
 * - Custom styleGuide   → name (locked while in use), type locked once created,
 *                          appliesTo editable, value editable, delete enabled
 *                          when not in use.
 * - Create (new custom) → all fields editable, defaults to type=color.
 *
 * The value editor is type-driven:
 * - color     → SketchPicker (same as CreateTokenDialog)
 * - dimension → UniversalInputControlled
 * - number    → plain number input
 * - text      → plain text input
 * Tokens with `quickPicks` show a chip row above the value editor.
 */
import { SketchPicker } from "@hello-pangea/color-picker";
import React, { useMemo, useState } from "react";
import { TbArrowLeft, TbCheck, TbTrash } from "react-icons/tb";
import { UniversalInputControlled } from "../UniversalInputControlled";
import { toolbarInputNoAutocompleteProps } from "../../../toolbarInputAttrs";
import {
  STYLE_TOKEN_REGISTRY,
  StyleTokenCategory,
  StyleTokenType,
  inferTokenType,
} from "../styleTokenRegistry";
import { DesignVar, ValueType } from "../types";
import { useStyleGuideTokens } from "../hooks/useStyleGuideTokens";
import { useTokenUsage } from "../hooks/useTokenUsage";

export interface VarEditorProps {
  mode: "edit" | "create";
  /** Required when mode === "edit". */
  token?: DesignVar;
  onBack: () => void;
}

const ALL_CATEGORIES: { value: StyleTokenCategory; label: string }[] = [
  { value: "spacing", label: "Spacing" },
  { value: "colors", label: "Colors" },
  { value: "typography", label: "Typography" },
  { value: "other", label: "Other" },
];

const ALL_TYPES: { value: StyleTokenType; label: string }[] = [
  { value: "color", label: "Color" },
  { value: "dimension", label: "Dimension" },
  { value: "number", label: "Number" },
  { value: "text", label: "Text" },
];

const DIMENSION_ALLOWED_TYPES: ValueType[] = ["px", "em", "rem", "%", "vh", "vw"];

/** Convert a display name into a stable styleGuide camelCase key.
 *  "Hero Gap" → "heroGap" / "brand purple" → "brandPurple". */
function nameToKey(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word, i) => {
      const lower = word.toLowerCase();
      return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

export function VarEditor({ mode, token, onBack }: VarEditorProps) {
  const { upsertToken, deleteToken, renameToken } = useStyleGuideTokens();
  const usage = useTokenUsage(token?.varName);
  const inUse = usage.count > 0;

  const isEdit = mode === "edit" && !!token;
  const tokenKey = token?.key;
  const registry = tokenKey ? STYLE_TOKEN_REGISTRY[tokenKey] : undefined;
  const isBuiltIn = !!registry && !token?.custom;

  // Derived initial values.
  const initialName = isEdit
    ? registry?.label ?? token!.label.replace(/\s*\(Custom\)$/, "")
    : "";
  const initialType: StyleTokenType = isEdit
    ? registry?.type ?? inferTokenType(token!.value)
    : "color";
  const initialCategory: StyleTokenCategory = isEdit
    ? registry?.category ?? (token!.category as StyleTokenCategory)
    : "colors";
  const initialValue = isEdit ? token!.value : "";

  const [name, setName] = useState(initialName);
  const [type, setType] = useState<StyleTokenType>(initialType);
  const [appliesTo, setAppliesTo] = useState<StyleTokenCategory[]>([initialCategory]);
  const [value, setValue] = useState(initialValue);

  const quickPicks = registry?.quickPicks;

  // Field locks
  const nameLocked = isBuiltIn || (isEdit && inUse);
  const typeLocked = isEdit; // can't change type after create — would orphan value
  const appliesToLocked = isBuiltIn;
  const canDelete = isEdit && !isBuiltIn && !inUse;

  // Validation for save
  const trimmedName = name.trim();
  const proposedKey = isEdit ? tokenKey! : nameToKey(trimmedName);
  const wouldShadowBuiltin =
    !isEdit && proposedKey in STYLE_TOKEN_REGISTRY ? true : false;
  const canSave = useMemo(() => {
    if (!trimmedName) return false;
    if (wouldShadowBuiltin) return false;
    if (!value && type !== "text") return false;
    return true;
  }, [trimmedName, wouldShadowBuiltin, value, type]);

  const toggleAppliesTo = (cat: StyleTokenCategory) => {
    setAppliesTo(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = () => {
    if (!canSave) return;
    if (isEdit) {
      // Rename if name changed (custom only — built-in renames are locked).
      const renamed = !isBuiltIn && trimmedName && nameToKey(trimmedName) !== tokenKey;
      if (renamed) {
        renameToken({ oldKey: tokenKey!, newKey: nameToKey(trimmedName) });
      }
      const finalKey = renamed ? nameToKey(trimmedName) : tokenKey!;
      upsertToken({
        key: finalKey,
        value,
        meta: isBuiltIn
          ? undefined
          : { custom: true, appliesTo },
      });
    } else {
      upsertToken({
        key: proposedKey,
        value,
        meta: { custom: true, appliesTo },
      });
    }
    onBack();
  };

  const handleDelete = () => {
    if (!canDelete) return;
    deleteToken(tokenKey!);
    onBack();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Back + Save row */}
      <div className="border-base-300 bg-base-200 flex shrink-0 items-center gap-2 border-b p-2">
        <button
          type="button"
          onClick={onBack}
          className="text-neutral-content hover:text-base-content flex size-6 items-center justify-center rounded"
          aria-label="Back to list"
        >
          <TbArrowLeft className="size-3.5" aria-hidden />
        </button>
        <span className="text-base-content text-xs font-semibold">
          {isEdit ? (isBuiltIn ? "Edit Built-in Token" : "Edit Custom Token") : "New Token"}
        </span>
      </div>

      {/* Body — flat form, scrollable if needed */}
      <div className="scrollbar-light flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {/* In-use banner */}
        {isEdit && inUse && (
          <div className="border-warning bg-warning/10 text-warning rounded-md border px-2 py-1.5 text-[11px]">
            Used by {usage.count} node{usage.count === 1 ? "" : "s"}. Remove references in the
            canvas before renaming or deleting.
          </div>
        )}

        {/* Name */}
        <label className="flex flex-col gap-1">
          <span className="text-neutral-content text-[11px] uppercase tracking-wide">Name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Hero Gap"
            disabled={nameLocked}
            className="border-base-300 bg-base-100 text-base-content placeholder:text-neutral-content focus:border-ring focus:ring-ring rounded-md border px-2 py-1.5 text-xs outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
            {...toolbarInputNoAutocompleteProps}
          />
          {wouldShadowBuiltin && (
            <span className="text-error text-[11px]">
              Name conflicts with a built-in token. Choose another.
            </span>
          )}
        </label>

        {/* Type */}
        <div className="flex flex-col gap-1">
          <span className="text-neutral-content text-[11px] uppercase tracking-wide">Type</span>
          <div className="flex flex-wrap gap-1">
            {ALL_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => !typeLocked && setType(t.value)}
                disabled={typeLocked}
                className={`rounded-md px-2 py-1 text-[11px] transition-colors disabled:cursor-not-allowed ${
                  type === t.value
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-base-content hover:bg-base-300"
                } ${typeLocked && type !== t.value ? "opacity-30" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Applies to */}
        <div className="flex flex-col gap-1">
          <span className="text-neutral-content text-[11px] uppercase tracking-wide">
            Applies To
          </span>
          <div className="flex flex-wrap gap-1">
            {ALL_CATEGORIES.map(c => {
              const active = appliesTo.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => !appliesToLocked && toggleAppliesTo(c.value)}
                  disabled={appliesToLocked}
                  className={`rounded-md px-2 py-1 text-[11px] transition-colors disabled:cursor-not-allowed ${
                    active
                      ? "bg-primary text-primary-content"
                      : "bg-base-200 text-base-content hover:bg-base-300"
                  } ${appliesToLocked && !active ? "opacity-30" : ""}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick picks (above value editor) */}
        {quickPicks && quickPicks.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-neutral-content text-[11px] uppercase tracking-wide">
              Presets
            </span>
            <div className="flex flex-wrap gap-1">
              {quickPicks.map(qp => (
                <button
                  key={qp.value}
                  type="button"
                  onClick={() => setValue(qp.value)}
                  className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                    value === qp.value
                      ? "bg-primary text-primary-content"
                      : "bg-base-200 text-base-content hover:bg-base-300"
                  }`}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Value editor — type-driven */}
        <div className="flex flex-col gap-1">
          <span className="text-neutral-content text-[11px] uppercase tracking-wide">Value</span>
          {type === "color" ? (
            <ColorValueEditor value={value} onChange={setValue} />
          ) : type === "dimension" ? (
            <UniversalInputControlled
              value={value}
              onChange={setValue}
              allowedTypes={DIMENSION_ALLOWED_TYPES}
              placeholder="e.g. 1rem"
              labelHide
            />
          ) : type === "number" ? (
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="0"
              className="border-base-300 bg-base-100 text-base-content focus:border-ring focus:ring-ring rounded-md border px-2 py-1.5 text-xs outline-none focus:ring-1"
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter value…"
              className="border-base-300 bg-base-100 text-base-content focus:border-ring focus:ring-ring rounded-md border px-2 py-1.5 text-xs outline-none focus:ring-1"
              {...toolbarInputNoAutocompleteProps}
            />
          )}
        </div>
      </div>

      {/* Footer — Save / Delete (custom edit only) */}
      <div className="border-base-300 bg-base-200 flex shrink-0 items-center gap-2 border-t p-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="bg-primary text-primary-content hover:bg-primary/90 flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TbCheck className="size-3" aria-hidden />
          {isEdit ? "Save" : "Create Token"}
        </button>
        {isEdit && !isBuiltIn && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete}
            className="border-base-300 text-neutral-content hover:border-error hover:text-error flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={inUse ? "Cannot delete — token is in use" : "Delete token"}
          >
            <TbTrash className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

interface ColorValueEditorProps {
  value: string;
  onChange: (v: string) => void;
}

function ColorValueEditor({ value, onChange }: ColorValueEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div
          className="border-base-300 size-8 shrink-0 rounded-md border-2"
          style={{ backgroundColor: value || "transparent" }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#3b82f6"
          className="border-base-300 bg-base-100 text-base-content focus:border-ring focus:ring-ring flex-1 rounded-md border px-2 py-1.5 text-xs outline-none focus:ring-1"
          {...toolbarInputNoAutocompleteProps}
        />
      </div>
      <div className="overflow-hidden rounded-md">
        <SketchPicker
          width="100%"
          presetColors={[]}
          styles={{
            picker: {},
            saturation: {
              width: "100%",
              height: "80px",
              paddingBottom: "",
              position: "relative" as const,
              overflow: "hidden",
            },
          }}
          color={value || "#000000"}
          onChangeComplete={c => onChange(c.hex)}
        />
      </div>
    </div>
  );
}
