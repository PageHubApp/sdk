import { parseIconRef } from "./collectIconRefs";

export interface IconSvgEntry {
  viewBox: string;
  svg: string;
}

export type IconSvgMap = Record<string, IconSvgEntry>;

const setCache = new Map<string, Record<string, IconSvgEntry>>();
const entryCache = new Map<string, IconSvgEntry>();

// Lazily resolve the path to the generated SVG registries. We keep this in a
// function so the SDK bundle can be imported in environments without `fs`
// (browser bundles) without blowing up at module load.
let _dataDir: string | null | undefined;
function getDataDir(): string | null {
  if (_dataDir !== undefined) return _dataDir;
  try {
    const path = require("node:path");
    // Always resolved from the repo root — data is generated to a stable path.
    _dataDir = path.resolve(process.cwd(), "packages/sdk/src/data/icon-svgs");
  } catch {
    _dataDir = null;
  }
  return _dataDir;
}

function loadSetSync(set: string): Record<string, IconSvgEntry> | null {
  const cached = setCache.get(set);
  if (cached) return cached;
  const dir = getDataDir();
  if (!dir) return null;
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const file = path.join(dir, `${set}.json`);
    const text = fs.readFileSync(file, "utf8");
    const registry = JSON.parse(text) as Record<string, IconSvgEntry>;
    setCache.set(set, registry);
    return registry;
  } catch {
    return null;
  }
}

export async function resolveIconSvg(ref: string): Promise<IconSvgEntry | null> {
  return resolveIconSvgSync(ref);
}

export function resolveIconSvgSync(ref: string): IconSvgEntry | null {
  const hit = entryCache.get(ref);
  if (hit) return hit;
  const parsed = parseIconRef(ref);
  if (!parsed) return null;
  const set = loadSetSync(parsed.set);
  if (!set) return null;
  const entry = set[parsed.name];
  if (!entry) return null;
  entryCache.set(ref, entry);
  return entry;
}

export async function preloadIcons(refs: string[]): Promise<IconSvgMap> {
  const out: IconSvgMap = {};
  if (!refs?.length) return out;

  const bySet = new Map<string, string[]>();
  for (const ref of refs) {
    const parsed = parseIconRef(ref);
    if (!parsed) continue;
    const list = bySet.get(parsed.set) ?? [];
    list.push(parsed.name);
    bySet.set(parsed.set, list);
  }

  for (const [set, names] of bySet) {
    const registry = loadSetSync(set);
    if (!registry) continue;
    for (const name of names) {
      const entry = registry[name];
      if (!entry) continue;
      const ref = `ref-icon:${set}/${name}`;
      out[ref] = entry;
      entryCache.set(ref, entry);
    }
  }

  return out;
}
