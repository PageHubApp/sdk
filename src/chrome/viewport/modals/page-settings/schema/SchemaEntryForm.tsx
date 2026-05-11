import React, { useMemo, useState } from "react";
import { TbChevronDown, TbChevronRight } from "react-icons/tb";
import { SchemaFieldRenderer } from "./SchemaFieldRenderer";
import { compileSchemaEntry } from "../../../../../utils/seo/compileSchema";
import {
  type SchemaEntryBuilder,
  getSchemaTypeDef,
} from "../../../../../utils/seo/schemaTypes";

interface SchemaEntryFormProps {
  entry: SchemaEntryBuilder;
  onChange: (next: SchemaEntryBuilder) => void;
  inputClass: string;
}

export function SchemaEntryForm({ entry, onChange, inputClass }: SchemaEntryFormProps) {
  const def = getSchemaTypeDef(entry.type);
  const [previewOpen, setPreviewOpen] = useState(false);

  const compiled = useMemo(() => compileSchemaEntry(entry), [entry]);
  const previewJson = useMemo(
    () => (compiled ? JSON.stringify(compiled, null, 2) : "// (empty — fill in required fields)"),
    [compiled]
  );

  if (!def) {
    return <p className="text-error text-sm">Unknown schema type: {entry.type}</p>;
  }

  const setField = (key: string, value: any) =>
    onChange({ ...entry, fields: { ...entry.fields, [key]: value } });

  return (
    <div className="space-y-5">
      <p className="text-neutral-content text-sm leading-relaxed">{def.description}</p>

      {def.fields.map(f => (
        <SchemaFieldRenderer
          key={f.key}
          field={f}
          value={entry.fields?.[f.key]}
          onChange={next => setField(f.key, next)}
          inputClass={inputClass}
        />
      ))}

      <div className="border-base-300 overflow-hidden rounded-xl border">
        <button
          type="button"
          onClick={() => setPreviewOpen(o => !o)}
          className="bg-base-200/40 hover:bg-base-200/70 flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors"
        >
          {previewOpen ? (
            <TbChevronDown className="size-4 shrink-0" />
          ) : (
            <TbChevronRight className="size-4 shrink-0" />
          )}
          <span className="text-base-content text-sm font-semibold">JSON-LD preview</span>
          <span className="text-neutral-content ml-auto text-xs">
            What search engines will see
          </span>
        </button>
        {previewOpen ? (
          <pre className="bg-base-300/40 text-base-content max-h-72 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed">
            {previewJson}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
