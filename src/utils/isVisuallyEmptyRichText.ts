/** True when HTML has no visible characters (empty tags / br / nbsp / whitespace only). */
export function isVisuallyEmptyRichText(html: string | null | undefined): boolean {
  if (html == null || !String(html).trim()) return true;
  const text = String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .trim();
  return text.length === 0;
}

/**
 * TipTap always wraps block content in `<p>`; when the doc is visually empty, persist `""`
 * so the tree and HTML fields do not keep `<p></p>` / `<p><br></p>` noise.
 */
export function persistedTextHtmlFromEditor(html: string | null | undefined): string {
  if (html == null) return "";
  const t = String(html).trim();
  if (isVisuallyEmptyRichText(t)) return "";
  return t;
}
