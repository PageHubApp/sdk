/**
 * Compiles SchemaEntry[] into an array of JSON-LD objects ready for
 * <script type="application/ld+json"> emission.
 *
 * Pruning rules: empty strings, empty arrays, empty objects are dropped.
 * Builder entries with no fields collapse to null (skipped by renderer).
 */

import {
  type SchemaEntry,
  type SchemaFieldDef,
  getSchemaTypeDef,
} from "./schemaTypes";

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function compileField(field: SchemaFieldDef, value: any): any {
  if (isEmpty(value)) return undefined;

  switch (field.kind) {
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    case "list": {
      if (!Array.isArray(value)) return undefined;
      const items = value
        .map((item, i) => compileListItem(field, item, i))
        .filter(v => v !== undefined);
      return items.length ? items : undefined;
    }
    case "nested": {
      return compileNested(field, value);
    }
    default:
      return typeof value === "string" ? value.trim() : value;
  }
}

function compileListItem(field: SchemaFieldDef, item: any, index: number): any {
  const fields = field.itemFields || [];
  // Single-field lists with a `value` key collapse to a primitive (e.g. sameAs URL strings, ingredients).
  if (fields.length === 1 && fields[0].key === "value" && fields[0].kind !== "nested" && fields[0].kind !== "list") {
    return compileField(fields[0], item?.value);
  }

  const out: Record<string, any> = {};
  if (field.itemType) out["@type"] = field.itemType;
  // BreadcrumbList wants 1-based "position" on each ListItem — fill if itemType matches and not user-provided.
  if (field.itemType === "ListItem" && (item?.position == null || item?.position === "")) {
    out.position = index + 1;
  }
  for (const sub of fields) {
    const compiled = compileField(sub, item?.[sub.key]);
    if (compiled !== undefined) out[sub.key] = compiled;
  }
  return Object.keys(out).length > (field.itemType ? 1 : 0) ? out : undefined;
}

function compileNested(field: SchemaFieldDef, value: any): any {
  const fields = field.nested || [];
  const out: Record<string, any> = {};
  if (field.nestedType) out["@type"] = field.nestedType;
  for (const sub of fields) {
    const compiled = compileField(sub, value?.[sub.key]);
    if (compiled !== undefined) out[sub.key] = compiled;
  }
  return Object.keys(out).length > (field.nestedType ? 1 : 0) ? out : undefined;
}

export function compileSchemaEntry(entry: SchemaEntry): Record<string, any> | null {
  if (entry.kind === "raw") {
    const raw = entry.json?.trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  const def = getSchemaTypeDef(entry.type);
  if (!def) return null;
  const out: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": entry.type,
  };
  for (const f of def.fields) {
    const compiled = compileField(f, entry.fields?.[f.key]);
    if (compiled !== undefined) out[f.key] = compiled;
  }
  return out;
}

export function compileSchema(entries: SchemaEntry[] | undefined): Record<string, any>[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .map(compileSchemaEntry)
    .filter((v): v is Record<string, any> => v != null);
}

/**
 * Normalize a legacy `seo.jsonLd` value — can be a string (textarea) or an
 * object. Returns a single JSON-LD object or null if unparseable / empty.
 * Fixes the historical double-encode bug where renderers wrapped strings in
 * JSON.stringify.
 */
export function normalizeLegacyJsonLd(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as object).length ? (value as Record<string, any>) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}
