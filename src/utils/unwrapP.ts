/**
 * Strip the `<p>` wrapper TipTap puts around Text content so it can sit inside
 * the node's own element (`<span>`, `<a>`, `<h2>`, …) without invalid nesting.
 * Multiple paragraphs collapse to `<br/><br/>`-separated runs.
 *
 * Both walkers call this — the React viewer (`Text.body.tsx`) and the static
 * exporter (`Text.toHTML.ts`) — so the two emit identical Text markup.
 */
export const unwrapP = (html: string): string => {
  const trimmed = html.trim();
  if (!/^<p>[\s\S]*<\/p>$/.test(trimmed)) return trimmed;
  if (/<\/p>\s*<p>/.test(trimmed)) {
    return trimmed
      .replace(/^<p>/, "")
      .replace(/<\/p>$/, "")
      .replace(/<\/p>\s*<p>/g, "<br/><br/>");
  }
  return trimmed.replace(/^<p>/, "").replace(/<\/p>$/, "");
};
