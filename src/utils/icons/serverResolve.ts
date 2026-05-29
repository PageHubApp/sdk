import { parseIconRef } from "./collectIconRefs";

export interface IconSvgEntry {
  viewBox: string;
  svg: string;
  /** Preserved outer <svg> presentation attrs from react-icons (stroke, fill, stroke-width, etc.).
   *  Undefined for older registries — renderer falls back to fill="currentColor". */
  attrs?: Record<string, string>;
}

export type IconSvgMap = Record<string, IconSvgEntry>;

const setCache = new Map<string, Record<string, IconSvgEntry>>();
const entryCache = new Map<string, IconSvgEntry>();

// Lazily resolve the path to the generated SVG registries. We keep this in a
// function so the SDK bundle can be imported in environments without `fs`
// (browser bundles) without blowing up at module load.
//
// Resolution order, first existing wins:
//   1. Resolve relative to the package install location via `@pagehub/sdk/package.json`
//      — works for any consumer that npm-installs the package.
//   2. `process.cwd() + "packages/sdk/src/data/icon-svgs"` — monorepo dev.
//   3. `process.cwd() + "node_modules/@pagehub/sdk/src/data/icon-svgs"` — fallback when
//      package-name resolution is unavailable (some bundled server contexts).
let _dataDir: string | null | undefined;
function getDataDir(): string | null {
  if (_dataDir !== undefined) return _dataDir;

  let path: typeof import("node:path");
  let fs: typeof import("node:fs");
  try {
    path = require("node:path");
    fs = require("node:fs");
  } catch {
    _dataDir = null;
    return null;
  }

  const candidates: string[] = [];

  // 1. Module-relative — works in ESM contexts where import.meta.url is defined.
  try {
    const url: string | undefined =
      typeof import.meta !== "undefined" ? (import.meta as ImportMeta).url : undefined;
    if (url) {
      const { createRequire } = require("node:module");
      const req = createRequire(url);
      const pkgPath = req.resolve("@pagehub/sdk/package.json");
      candidates.push(path.resolve(path.dirname(pkgPath), "src/data/icon-svgs"));
    }
  } catch { /* skip — fall through to cwd-based candidates */ }

  // 2. Monorepo dev (cwd = repo root).
  candidates.push(path.resolve(process.cwd(), "packages/sdk/src/data/icon-svgs"));

  // 3. Consumer's local node_modules (cwd = consumer project root).
  candidates.push(path.resolve(process.cwd(), "node_modules/@pagehub/sdk/src/data/icon-svgs"));

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        _dataDir = c;
        return c;
      }
    } catch { /* skip */ }
  }

  _dataDir = null;
  return null;
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
