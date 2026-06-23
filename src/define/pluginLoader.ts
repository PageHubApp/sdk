/**
 * Plugin loader — editor half + shared ordering (P3 §3).
 *
 * `resolvePluginOrder` + `assertNoSingleInstanceCollision` are PURE and
 * browser-safe; the host app's server loader reuses them. `applyEditorPlugins`
 * is pure aggregation over `register*()` functions that already run at runtime —
 * NO new registry is invented; the loader is just the single caller of seams
 * that today have scattered callers.
 */
import type { PluginManifestBase, EditorContributions } from "./pluginTypes";
import { EDITOR_SINGLE_INSTANCE_FIELDS } from "./pluginTypes";
import type { ResolvedComponentDef } from "./types";
import type { RegistriesBundle } from "../registry";
import { registerPresets, registerModifiers } from "./catalogRegistry";
import { registerBlocksProvider } from "./blocksProvider";
import {
  registerProperties,
  registerSectionDef,
} from "../chrome/toolbar/inspector/registry/propertyRegistry";
import { registerMediaUploadHandler, registerMediaUploadAccept } from "../utils/media/registry";
import { registerSubmissionHandler } from "../utils/submissions";
import { registerClientDataFetcher } from "../utils/design/variables";

/**
 * Topo-sort by `dependsOn` (Kahn's). Install-list order breaks ties (stable).
 * Cycle → throw at boot (fail loud). A `dependsOn` target that isn't installed
 * → warn + drop that edge (an `overlayOnly()` dependency may legitimately be
 * absent in a fresh OSS clone). Returns plugins in dependency order.
 */
export function resolvePluginOrder<T extends PluginManifestBase>(plugins: T[]): T[] {
  const byId = new Map<string, T>();
  for (const p of plugins) byId.set(p.id, p);

  const indeg = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // dep id -> ids that depend on it
  for (const p of plugins) indeg.set(p.id, 0);
  for (const p of plugins) {
    for (const dep of p.dependsOn ?? []) {
      if (!byId.has(dep)) {
        console.warn(
          `[plugins] "${p.id}" dependsOn "${dep}" which is not installed — dropping that edge`
        );
        continue;
      }
      indeg.set(p.id, (indeg.get(p.id) ?? 0) + 1);
      if (!dependents.has(dep)) dependents.set(dep, []);
      dependents.get(dep)!.push(p.id);
    }
  }

  // Seed the queue in install-list order among zero-indegree nodes (stable ties).
  const queue = plugins.filter(p => (indeg.get(p.id) ?? 0) === 0).map(p => p.id);
  const ordered: T[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    ordered.push(byId.get(id)!);
    for (const next of dependents.get(id) ?? []) {
      const d = (indeg.get(next) ?? 0) - 1;
      indeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  if (ordered.length !== plugins.length) {
    const inCycle = plugins.filter(p => !ordered.includes(p)).map(p => p.id);
    throw new Error(`[plugins] dependsOn cycle detected among: ${inCycle.join(", ")}`);
  }
  return ordered;
}

/**
 * Single-instance arbitration (P3 §3, §7 decided). Two plugins setting the same
 * single-instance field on a half is a BOOT ERROR — detected up front (the
 * manifest is inspectable before any side effect) and thrown naming both plugins
 * + the contended field, never silent last-wins.
 */
export function assertNoSingleInstanceCollision(
  plugins: PluginManifestBase[],
  half: "editor" | "server",
  fields: readonly string[],
  pick: (p: PluginManifestBase) => Record<string, unknown> | undefined
): void {
  const owner: Record<string, string> = {};
  for (const p of plugins) {
    const contrib = pick(p);
    if (!contrib) continue;
    for (const f of fields) {
      if (contrib[f] == null) continue;
      if (owner[f]) {
        throw new Error(
          `[plugins] single-instance ${half} field "${f}" is claimed by both "${owner[f]}" and "${p.id}" — only one plugin may set it`
        );
      }
      owner[f] = p.id;
    }
  }
}

/**
 * Apply every plugin's editor half. Threads `components[]` (the resolver-merge
 * path that reaches editor + viewer + static renderer — P3 §4), registers
 * presets/modifiers/properties/sections, sets the single-instance handlers, and
 * runs `contributeRegistries`. Returns the accumulated `components[]` to pass to
 * `<PageHubEditor components={...}>`.
 */
export function applyEditorPlugins(
  plugins: PluginManifestBase[],
  bundle: Omit<RegistriesBundle, "tick">
): ResolvedComponentDef[] {
  const ordered = resolvePluginOrder(plugins);
  assertNoSingleInstanceCollision(
    ordered,
    "editor",
    EDITOR_SINGLE_INSTANCE_FIELDS,
    p => p.editor as Record<string, unknown> | undefined
  );

  const components: ResolvedComponentDef[] = [];
  for (const p of ordered) {
    const e = p.editor as EditorContributions | undefined;
    if (!e) continue;
    if (e.components?.length) components.push(...e.components);
    if (e.presets) {
      for (const [name, list] of Object.entries(e.presets)) registerPresets(name, list);
    }
    if (e.modifiers) {
      for (const [name, list] of Object.entries(e.modifiers)) registerModifiers(name, list);
    }
    if (e.properties?.length) registerProperties(e.properties);
    if (e.sections?.length) for (const s of e.sections) registerSectionDef(s);
    if (e.blocksProvider) registerBlocksProvider(e.blocksProvider);
    if (e.mediaHandler) registerMediaUploadHandler(e.mediaHandler);
    if (e.mediaAccept) registerMediaUploadAccept(e.mediaAccept);
    if (e.submissionHandler) registerSubmissionHandler(e.submissionHandler);
    if (e.clientDataFetcher) registerClientDataFetcher(e.clientDataFetcher);
    if (e.contributeRegistries) e.contributeRegistries(bundle);
  }
  return components;
}
