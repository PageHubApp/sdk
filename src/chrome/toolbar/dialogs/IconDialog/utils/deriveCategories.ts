export interface IconCategory {
  key: string;
  label: string;
  refs: string[];
}

const MIN_CATEGORY_SIZE = 20;
const MAX_REFS_PER_CATEGORY = 200;
const cache = new Map<string, IconCategory[]>();

function extractToken(strippedName: string): string | null {
  if (!strippedName) return null;
  const match = strippedName.match(/^[A-Z][a-z0-9]*/);
  return match ? match[0] : null;
}

export function deriveCategories(setId: string, names: string[]): IconCategory[] {
  if (!setId || !names || names.length === 0) return [];
  const cached = cache.get(setId);
  if (cached) return cached;

  const prefix = setId[0].toUpperCase() + setId.slice(1);
  const groups = new Map<string, string[]>();

  for (const name of names) {
    if (!name.startsWith(prefix)) continue;
    const stripped = name.slice(prefix.length);
    const token = extractToken(stripped);
    if (!token) continue;
    const ref = `${setId}/${name}`;
    const existing = groups.get(token);
    if (existing) existing.push(ref);
    else groups.set(token, [ref]);
  }

  const result: IconCategory[] = [];
  for (const [token, refs] of groups) {
    if (refs.length < MIN_CATEGORY_SIZE) continue;
    result.push({
      key: token,
      label: token,
      refs: refs.slice(0, MAX_REFS_PER_CATEGORY),
    });
  }

  result.sort((a, b) => b.refs.length - a.refs.length);
  cache.set(setId, result);
  return result;
}
