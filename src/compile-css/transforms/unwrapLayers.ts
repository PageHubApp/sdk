// ── Layer unwrapping ───────────────────────────────────────────────────────

export function unwrapLayerBlocks(css: string): string {
  const layerRe = /@layer\s+[^{;]+\{/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = layerRe.exec(css)) !== null) {
    result += css.slice(lastIndex, match.index);
    let depth = 1;
    let j = match.index + match[0].length;
    const innerStart = j;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    result += unwrapLayerBlocks(css.slice(innerStart, j - 1));
    lastIndex = j;
    layerRe.lastIndex = j;
  }
  result += css.slice(lastIndex);
  return result;
}
