import React from "react";
import { compileSchema, normalizeJsonLd } from "./compileSchema";
import type { SchemaEntry } from "./schemaTypes";

interface JsonLdScriptsProps {
  /**
   * Page-level seo bag from the page Container node. May carry a raw `jsonLd`
   * object plus a structured `schema: SchemaEntry[]` array from the builder.
   */
  seo: { jsonLd?: unknown; schema?: SchemaEntry[] | null } | null | undefined;
}

/**
 * Renders one `<script type="application/ld+json">` per JSON-LD object derived
 * from the page's seo bag. Drop inside Next's `<Head>` (or any head context).
 * Renders nothing when there's no structured data.
 */
export function JsonLdScripts({ seo }: JsonLdScriptsProps) {
  if (!seo) return null;

  const objects: Record<string, any>[] = [];

  const raw = normalizeJsonLd(seo.jsonLd);
  if (raw) objects.push(raw);

  if (Array.isArray(seo.schema) && seo.schema.length) {
    objects.push(...compileSchema(seo.schema));
  }

  if (!objects.length) return null;

  return (
    <>
      {objects.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(obj) }}
        />
      ))}
    </>
  );
}

/** Escape `</script>` close-tags that would otherwise break out of the inline JSON. */
function serializeJsonLd(obj: Record<string, any>): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
