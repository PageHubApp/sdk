/**
 * Builds the published package into `dist/` (the `build` / `prepack` script, run from the package folder).
 *
 * The monorepo consumes `src/` directly; the npm tarball ships `dist/` only (`publishConfig.exports`).
 *
 *   1. esbuild compiles every `src/**` .ts/.tsx file (tests and .d.ts excluded) to its own ESM file, same path under
 *      `dist/`. Relative imports and the `@/` alias stay imports (rewritten to explicit `.js` paths), so each module
 *      keeps its depth: the compile-css loaders read `../../css/theme.css` relative to themselves and that still
 *      lands on `dist/css/theme.css`. npm packages stay external; JSON imports are inlined.
 *   2. non-code files under `src` (css, the generated icon registries, json) are copied across.
 *   3. `tsc --noCheck` emits the `.d.ts` files (tsconfig.build.json); their `@/` and extensionless specifiers are
 *      rewritten the same way. Type errors do not stop the build: `pnpm typecheck` is the type gate.
 *   4. every npm package the output imports must be declared in `dependencies` / `peerDependencies`, else it fails.
 *
 * The icon registries (`src/data/icon-svgs`) are generated, not tracked: run the app's `pnpm gen:icons` first.
 */
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { builtinModules } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = process.cwd();
const src = join(root, "src");
const out = join(root, "dist");
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const require = createRequire(import.meta.url);

const walk = async (dir) => {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
};

const isDts = (f) => /\.d\.[cm]?ts$/.test(f);
const isTest = (f) => /\.test\.tsx?$/.test(f);
const isTs = (f) => /\.tsx?$/.test(f) && !isDts(f);
const all = await walk(src);

if (!existsSync(join(src, "data/icon-svgs/tb.json"))) {
  throw new Error("src/data/icon-svgs is missing: run `pnpm gen:icons` from the monorepo root first.");
}

/** The file a relative or `@/` specifier points at, and the explicit `.js` specifier that replaces it. */
const FILE_EXT = [".ts", ".tsx"];
function locate(spec, fromDir) {
  const base = spec.startsWith("@/") ? join(src, spec.slice(2)) : resolve(fromDir, spec);
  if (existsSync(base) && statSync(base).isFile()) return { file: base, kind: "file" };
  for (const ext of FILE_EXT) if (existsSync(base + ext)) return { file: base + ext, kind: "ext" };
  for (const ext of FILE_EXT) if (existsSync(join(base, "index" + ext))) return { file: join(base, "index" + ext), kind: "index" };
  return null;
}
function jsSpecifier(spec, fromDir) {
  const hit = locate(spec, fromDir);
  if (!hit) return null;
  const target = hit.kind === "index" ? join(dirname(hit.file), "index.js") : hit.file.replace(/\.tsx?$/, ".js");
  let rel = relative(fromDir, target).split(sep).join("/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

/** Each module compiles on its own: relative + alias imports become external, explicit-extension imports. */
const perFile = {
  name: "per-file",
  setup(b) {
    b.onResolve({ filter: /^(\.{1,2}\/|@\/)/ }, (args) => {
      if (/\.json$/.test(args.path)) return undefined; // inlined
      const spec = jsSpecifier(args.path, args.resolveDir);
      if (!spec) return { errors: [{ text: `cannot resolve ${args.path}` }] };
      // `.js` in the output points at the sibling output file; `external` keeps it as written
      return { path: spec, external: true };
    });
  },
};

await rm(out, { recursive: true, force: true });
const entries = all.filter((f) => isTs(f) && !isTest(f));
const result = await build({
  entryPoints: entries,
  outdir: out,
  outbase: src,
  bundle: true,
  splitting: false,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  packages: "external",
  mainFields: ["module", "main"],
  plugins: [perFile],
  metafile: true,
  logLevel: "warning",
});

for (const f of all.filter((f) => !isTs(f) && !isDts(f) && !/\.m?js$/.test(f) && !isTest(f))) {
  const to = join(out, f.slice(src.length + 1));
  await mkdir(dirname(to), { recursive: true });
  await copyFile(f, to);
}

const tsc = spawnSync(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", "tsconfig.build.json", "--noCheck", "--outDir", out], {
  cwd: root,
  stdio: "inherit",
});
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

// d.ts: `@/x` and extensionless relative specifiers -> explicit relative `.js` (Node ESM type resolution)
const SPEC = /(\bfrom\s*|\bimport\s*\(\s*)(["'])((?:\.{1,2}\/|@\/)[^"'\n]*?)\2/g;
for (const f of (await walk(out)).filter((f) => f.endsWith(".d.ts"))) {
  const text = await readFile(f, "utf8");
  const srcDir = dirname(join(src, relative(out, f)));
  const next = text.replace(SPEC, (m, pre, q, spec) => {
    if (/\.(js|json|css)$/.test(spec)) return m;
    const rel = jsSpecifier(spec, srcDir);
    if (!rel) throw new Error(`${pkg.name}: ${relative(root, f)} imports ${spec}, which has no source file`);
    return `${pre}${q}${rel}${q}`;
  });
  if (next !== text) await writeFile(f, next);
}

// every bare import in the output must be a declared dependency or peer
const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})]);
const builtins = new Set(builtinModules);
const undeclared = new Set();
for (const o of Object.values(result.metafile.outputs)) {
  for (const imp of o.imports) {
    if (!imp.external || /^(\.{1,2}\/|\/)/.test(imp.path)) continue;
    const p = imp.path.replace(/^node:/, "");
    if (builtins.has(p.split("/")[0]) || builtins.has(p)) continue;
    const name = imp.path.startsWith("@") ? imp.path.split("/").slice(0, 2).join("/") : imp.path.split("/")[0];
    if (!declared.has(name)) undeclared.add(name);
  }
}
if (undeclared.size) throw new Error(`${pkg.name}: dist imports undeclared packages: ${[...undeclared].join(", ")}`);

console.log(`${pkg.name}: ${entries.length} modules -> dist`);
