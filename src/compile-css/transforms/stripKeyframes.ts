// ── Strip unused @keyframes ───────────────────────────────────────────────

/**
 * Remove @keyframes blocks whose name is not referenced by any animation-name
 * in the CSS output. Prevents animation presets from bloating standalone exports.
 *
 * Only runs in `lean: true` mode (standalone exports via `siteExportZip`). The
 * hosted paths (/view, /static, /build, custom domains) leave orphan keyframes
 * intact.
 */
export function stripUnusedKeyframes(css: string): string {
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
  let result = css;
  for (let i = keyframeBlocks.length - 1; i >= 0; i--) {
    const kb = keyframeBlocks[i];
    if (!usedNames.has(kb.name)) {
      result = result.slice(0, kb.start) + result.slice(kb.end);
    }
  }
  return result;
}
