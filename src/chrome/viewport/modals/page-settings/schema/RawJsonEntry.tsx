import React, { useMemo } from "react";
import { CodeEditor } from "../../../../toolbar/inputs/typography/CodeEditor";
import { SettingsCallout } from "../../settings/SettingsTabChrome";
import type { SchemaEntryRaw } from "../../../../../utils/seo/schemaTypes";

interface RawJsonEntryProps {
  entry: SchemaEntryRaw;
  onChange: (next: SchemaEntryRaw) => void;
}

export function RawJsonEntry({ entry, onChange }: RawJsonEntryProps) {
  const parseError = useMemo(() => {
    const trimmed = entry.json?.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid JSON";
    }
  }, [entry.json]);

  return (
    <div className="space-y-3">
      <p className="text-neutral-content text-sm leading-relaxed">
        Paste a complete JSON-LD object. Useful for schema types not in the builder, or hand-tuned
        snippets copied from{" "}
        <a
          href="https://schema.org/docs/full.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          schema.org
        </a>
        .
      </p>
      <CodeEditor
        value={entry.json}
        onChange={value => onChange({ ...entry, json: value })}
        language="javascript"
        height="280px"
        placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "About"\n}'}
      />
      {parseError ? (
        <SettingsCallout title="JSON error">
          <code className="text-error font-mono text-xs">{parseError}</code>
        </SettingsCallout>
      ) : null}
    </div>
  );
}
