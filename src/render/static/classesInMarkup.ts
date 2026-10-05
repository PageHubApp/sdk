/**
 * Every class token in `markup`'s `class="…"` attributes, entity-decoded
 * (`[&amp;_li]:py-1` → `[&_li]:py-1`).
 *
 * The walker's class list feeds the CSS compiler, and components hard-code
 * classes in their markup (a form label's `mb-1`, an icon wrapper's
 * `size-full`) that no node prop carries — so the list is read off the output.
 */
export function classesInMarkup(markup: string): string[] {
  const out = new Set<string>();
  for (const m of markup.matchAll(/\sclass="([^"]*)"/g)) {
    const value = m[1]
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    for (const cls of value.split(/\s+/)) if (cls) out.add(cls);
  }
  return [...out];
}
