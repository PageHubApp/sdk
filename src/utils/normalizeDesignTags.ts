const MAX_TAGS = 24;
const MAX_TAG_LEN = 50;

/** Dedupe, trim, cap count — same rules as app `utils/designIntent.ts`. */
export function normalizeDesignTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    const x = String(t).trim().slice(0, MAX_TAG_LEN);
    if (!x || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}
