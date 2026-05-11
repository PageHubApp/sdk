import React from "react";
import { TbPlus, TbX } from "react-icons/tb";
import { StandaloneImagePicker } from "../../../pickers/StandaloneImagePicker";
import { SettingsFormField } from "../../settings/SettingsTabChrome";
import type { SchemaFieldDef } from "../../../../../utils/seo/schemaTypes";

interface SchemaFieldRendererProps {
  field: SchemaFieldDef;
  value: any;
  onChange: (next: any) => void;
  inputClass: string;
  /** Nesting depth — affects indentation of nested cards. */
  depth?: number;
}

export function SchemaFieldRenderer({
  field,
  value,
  onChange,
  inputClass,
  depth = 0,
}: SchemaFieldRendererProps) {
  const help = field.help ? (
    <span>
      {field.required ? <span className="text-error">Required. </span> : null}
      {field.help}
    </span>
  ) : field.required ? (
    <span className="text-error">Required.</span>
  ) : undefined;

  switch (field.kind) {
    case "text":
    case "url":
      return (
        <SettingsFormField label={field.label} hint={help}>
          <input
            type={field.kind === "url" ? "url" : "text"}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            className={inputClass}
            placeholder={field.placeholder}
          />
        </SettingsFormField>
      );

    case "number":
      return (
        <SettingsFormField label={field.label} hint={help}>
          <input
            type="number"
            value={value ?? ""}
            onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            className={inputClass}
            placeholder={field.placeholder}
          />
        </SettingsFormField>
      );

    case "date":
      return (
        <SettingsFormField label={field.label} hint={help}>
          <input
            type="date"
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            className={inputClass}
          />
        </SettingsFormField>
      );

    case "datetime":
      return (
        <SettingsFormField label={field.label} hint={help}>
          <input
            type="datetime-local"
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            className={inputClass}
          />
        </SettingsFormField>
      );

    case "textarea":
      return (
        <SettingsFormField label={field.label} hint={help}>
          <textarea
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder={field.placeholder}
          />
        </SettingsFormField>
      );

    case "select":
      return (
        <SettingsFormField label={field.label} hint={help}>
          <select
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            className={inputClass}
          >
            <option value="">— Select —</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </SettingsFormField>
      );

    case "image":
      return (
        <SettingsFormField label={field.label} hint={help}>
          <StandaloneImagePicker value={value || ""} onChange={onChange} label={field.label} />
        </SettingsFormField>
      );

    case "nested":
      return (
        <NestedFieldRenderer
          field={field}
          value={value || {}}
          onChange={onChange}
          inputClass={inputClass}
          depth={depth}
        />
      );

    case "list":
      return (
        <ListFieldRenderer
          field={field}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          inputClass={inputClass}
          depth={depth}
        />
      );

    default:
      return null;
  }
}

function NestedFieldRenderer({
  field,
  value,
  onChange,
  inputClass,
  depth,
}: {
  field: SchemaFieldDef;
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  inputClass: string;
  depth: number;
}) {
  const nested = field.nested || [];
  const setSub = (key: string, sub: any) => onChange({ ...value, [key]: sub });

  return (
    <div className="space-y-2">
      <label className="text-base-content block text-sm font-semibold tracking-tight">
        {field.label}
      </label>
      <div className="border-base-300 bg-base-200/30 space-y-4 rounded-xl border p-4">
        {nested.map(sub => (
          <SchemaFieldRenderer
            key={sub.key}
            field={sub}
            value={value?.[sub.key]}
            onChange={next => setSub(sub.key, next)}
            inputClass={inputClass}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

function ListFieldRenderer({
  field,
  value,
  onChange,
  inputClass,
  depth,
}: {
  field: SchemaFieldDef;
  value: any[];
  onChange: (next: any[]) => void;
  inputClass: string;
  depth: number;
}) {
  const itemFields = field.itemFields || [];
  const isPrimitiveList =
    itemFields.length === 1 &&
    itemFields[0].key === "value" &&
    itemFields[0].kind !== "nested" &&
    itemFields[0].kind !== "list";

  const addItem = () => {
    if (isPrimitiveList) {
      onChange([...value, { value: "" }]);
      return;
    }
    const blank: Record<string, any> = {};
    for (const sub of itemFields) {
      if (sub.kind === "list") blank[sub.key] = [];
      else if (sub.kind === "nested") blank[sub.key] = {};
      else blank[sub.key] = "";
    }
    onChange([...value, blank]);
  };

  const removeItem = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const updateItem = (idx: number, next: any) => {
    const copy = value.slice();
    copy[idx] = next;
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      <label className="text-base-content block text-sm font-semibold tracking-tight">
        {field.label}
      </label>
      {field.help ? <p className="text-neutral-content text-xs leading-relaxed">{field.help}</p> : null}

      <div className="space-y-3">
        {value.map((item, idx) => (
          <div
            key={idx}
            className="border-base-300 bg-base-200/30 relative rounded-xl border p-4"
          >
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-neutral-content hover:text-error absolute top-2 right-2 rounded-md p-1 transition-colors"
              aria-label={`Remove ${field.itemLabel || "item"} ${idx + 1}`}
            >
              <TbX className="size-4" />
            </button>

            {isPrimitiveList ? (
              <SchemaFieldRenderer
                field={itemFields[0]}
                value={item?.value}
                onChange={next => updateItem(idx, { value: next })}
                inputClass={inputClass}
                depth={depth + 1}
              />
            ) : (
              <div className="space-y-4 pr-6">
                {itemFields.map(sub => (
                  <SchemaFieldRenderer
                    key={sub.key}
                    field={sub}
                    value={item?.[sub.key]}
                    onChange={next => updateItem(idx, { ...item, [sub.key]: next })}
                    inputClass={inputClass}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="btn btn-outline btn-sm gap-2"
      >
        <TbPlus className="size-4" />
        {field.itemLabel || `Add ${field.label.toLowerCase()}`}
      </button>
    </div>
  );
}
