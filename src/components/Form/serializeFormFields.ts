/**
 * Form field serialization for the React submit paths (Form.tsx editor/preview
 * and Form.render.tsx walker). Uses native `FormData` — the same source the
 * static runtime (`render/static/runtime/chunks/forms.ts`) reads — so both
 * walkers agree on checkbox / radio semantics:
 *   - unchecked checkbox → omitted
 *   - checked checkbox   → its `value` attribute, else "on"
 *   - radio group        → only the checked option's value
 *   - disabled fields    → omitted
 * File inputs are dropped: the JSON submit body can't carry them.
 */

/** Collapse FormData-shaped entries into a JSON-safe record. Non-string
 *  entries (File) are skipped; a repeated name keeps its last value. */
export function formEntriesToRecord(
  entries: Iterable<[string, FormDataEntryValue]>
): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [name, value] of entries) {
    if (typeof value === "string") data[name] = value;
  }
  return data;
}

export function serializeFormFields(form: HTMLFormElement): Record<string, string> {
  return formEntriesToRecord(new FormData(form));
}
