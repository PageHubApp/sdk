import React, { useState } from "react";
import { TbChevronDown, TbChevronRight, TbCode, TbTrash } from "react-icons/tb";
import { RawJsonEntry } from "./RawJsonEntry";
import { SchemaEntryForm } from "./SchemaEntryForm";
import {
  type SchemaEntry,
  type SchemaEntryBuilder,
  type SchemaEntryRaw,
  getSchemaTypeDef,
} from "../../../../../utils/seo/schemaTypes";

interface SchemaEntryCardProps {
  entry: SchemaEntry;
  onChange: (next: SchemaEntry) => void;
  onRemove: () => void;
  inputClass: string;
  defaultOpen?: boolean;
}

export function SchemaEntryCard({
  entry,
  onChange,
  onRemove,
  inputClass,
  defaultOpen = false,
}: SchemaEntryCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const { title, subtitle } =
    entry.kind === "raw" ? rawSummary(entry) : builderSummary(entry);

  return (
    <div className="border-base-300 overflow-hidden rounded-xl border">
      <header className="bg-base-200/30 flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="text-neutral-content hover:text-base-content shrink-0 transition-colors"
          aria-label={open ? "Collapse entry" : "Expand entry"}
        >
          {open ? <TbChevronDown className="size-4" /> : <TbChevronRight className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
        >
          <span className="flex items-center gap-2">
            {entry.kind === "raw" ? (
              <TbCode className="text-neutral-content size-3.5" aria-hidden />
            ) : null}
            <span className="text-base-content text-sm font-semibold">{title}</span>
          </span>
          <span className="text-neutral-content truncate text-xs">{subtitle}</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-neutral-content hover:text-error rounded-md p-1.5 transition-colors"
          aria-label="Remove entry"
        >
          <TbTrash className="size-4" />
        </button>
      </header>

      {open ? (
        <div className="bg-base-100 px-4 py-4">
          {entry.kind === "builder" ? (
            <SchemaEntryForm
              entry={entry}
              onChange={onChange as (next: SchemaEntryBuilder) => void}
              inputClass={inputClass}
            />
          ) : (
            <RawJsonEntry
              entry={entry}
              onChange={onChange as (next: SchemaEntryRaw) => void}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function builderSummary(entry: SchemaEntryBuilder): { title: string; subtitle: string } {
  const def = getSchemaTypeDef(entry.type);
  const title = def?.label || entry.type;
  let subtitle = "";
  try {
    subtitle = def?.summary(entry.fields || {}) || "";
  } catch {
    subtitle = "";
  }
  return { title, subtitle: subtitle || `@type: ${entry.type}` };
}

function rawSummary(entry: SchemaEntryRaw): { title: string; subtitle: string } {
  const raw = entry.json?.trim();
  if (!raw) return { title: "Raw JSON-LD", subtitle: "(empty)" };
  try {
    const parsed = JSON.parse(raw);
    const t = parsed?.["@type"];
    const name = parsed?.name || parsed?.headline || "";
    return {
      title: typeof t === "string" ? `Raw · ${t}` : "Raw JSON-LD",
      subtitle: typeof name === "string" && name ? name : "Custom schema",
    };
  } catch {
    return { title: "Raw JSON-LD", subtitle: "Invalid JSON" };
  }
}
