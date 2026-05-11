import React, { useState } from "react";
import { TbPlus } from "react-icons/tb";
import { SchemaEntryCard } from "./schema/SchemaEntryCard";
import { SchemaTypePicker } from "./schema/SchemaTypePicker";
import {
  SettingsCallout,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import {
  createEmptySchemaFields,
  getSchemaTypeDef,
  type SchemaEntry,
  type SchemaTypeKey,
} from "../../../../utils/seo/schemaTypes";

interface SchemaTabProps {
  schema: SchemaEntry[];
  setSchema: (next: SchemaEntry[]) => void;
  inputClass: string;
}

function makeId(): string {
  return `sch_${Math.random().toString(36).slice(2, 9)}`;
}

export function SchemaTab({ schema, setSchema, inputClass }: SchemaTabProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  const entries = Array.isArray(schema) ? schema : [];

  const addBuilder = (type: SchemaTypeKey) => {
    const def = getSchemaTypeDef(type);
    if (!def) return;
    const id = makeId();
    const next: SchemaEntry = { kind: "builder", id, type, fields: createEmptySchemaFields(def) };
    setSchema([...entries, next]);
    setNewlyAddedId(id);
  };

  const addRaw = () => {
    const id = makeId();
    const next: SchemaEntry = { kind: "raw", id, json: "" };
    setSchema([...entries, next]);
    setNewlyAddedId(id);
  };

  const updateEntry = (id: string, next: SchemaEntry) =>
    setSchema(entries.map(e => (e.id === id ? next : e)));

  const removeEntry = (id: string) => setSchema(entries.filter(e => e.id !== id));

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Structured data (JSON-LD)"
        description="Tell search engines what this page is about. Add one entry per thing — your business, an article, a product, FAQs — and each shows up as its own rich result in Google."
      />

      {entries.length === 0 ? (
        <SettingsCallout title="No schema yet">
          Add an Organization or LocalBusiness entry to help Google identify your brand, or pick a
          page-specific type like Article, Product, or FAQ.
        </SettingsCallout>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <SchemaEntryCard
              key={entry.id}
              entry={entry}
              onChange={next => updateEntry(entry.id, next)}
              onRemove={() => removeEntry(entry.id)}
              inputClass={inputClass}
              defaultOpen={entry.id === newlyAddedId}
            />
          ))}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="btn btn-primary gap-2"
        >
          <TbPlus className="size-4" />
          Add schema
        </button>
      </div>

      <SchemaTypePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPickType={addBuilder}
        onPickRaw={addRaw}
      />
    </div>
  );
}
