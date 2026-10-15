// ── Strip unused @keyframes ───────────────────────────────────────────────

/**
 * Remove @keyframes blocks whose name is not referenced by any animation-name
 * in the CSS output, nor mentioned in `keepIfMentionedIn` (the page's own
 * serialized node tree). Prevents every animation preset shipping on every page.
 *
 * Runs in `lean: true` mode: standalone exports and every public render
 * (`compileTailwindCSS` without `editor`). The editor keeps them all, since an
 * author can add an animation at any moment.
 */
export function stripUnusedKeyframes(css: string, keepIfMentionedIn?: string): string {
  // Collect all @keyframes names
  const keyframeBlocks: { name: string; start: number; end: number }[] = [];
  const kfRe = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = kfRe.exec(css)) !== null) {
    let depth = 1;
    let j = m.index + m[0].length;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    keyframeBlocks.push({ name: m[1], start: m.index, end: j });
  }
  if (keyframeBlocks.length === 0) return css;

  // Find which animation names are actually referenced
  const usedNames = new Set<string>();
  const animRe = /animation(?:-name)?\s*:\s*([^;{}]+)/g;
  while ((m = animRe.exec(css)) !== null) {
    for (const token of m[1].split(/[\s,]+/)) {
      if (token && token !== "none" && token !== "inherit" && token !== "initial") {
        usedNames.add(token);
      }
    }
  }

  // Remove unreferenced keyframes (iterate in reverse to preserve indices)
  // A name the page itself mentions (an inline `animation:` in `root.style`,
  // custom code in `inject`, a handler) is used even though no compiled rule
  // references it.
  const mentioned = (name: string) =>
    !!keepIfMentionedIn && new RegExp(`(^|[^\\w-])${name}([^\\w-]|$)`).test(keepIfMentionedIn);

  let result = css;
  for (let i = keyframeBlocks.length - 1; i >= 0; i--) {
    const kb = keyframeBlocks[i];
    if (!usedNames.has(kb.name) && !mentioned(kb.name)) {
      result = result.slice(0, kb.start) + result.slice(kb.end);
    }
  }
  return result;
}
