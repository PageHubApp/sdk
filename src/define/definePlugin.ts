/**
 * `definePlugin` — validate + freeze a plugin manifest (P3). Mirrors
 * `defineComponent`: a frozen DATA object the loader can inspect (topo-sort
 * `dependsOn`, detect single-instance collisions) BEFORE any side effect fires.
 * It does NOT call `register*()` itself — the loaders do, in dependency order.
 *
 * Browser-safe (no Node deps): a plugin package imports this from `@pagehub/sdk`.
 * See docs/strategy/specs/p3-plugin-system.md §2.
 */
import type { PluginManifestBase } from "./pluginTypes";

// Reverse-DNS-ish: lowercase, at least one dot (e.g. "pagehub.seo", "ph.auth-magic-link").
const PLUGIN_ID_RE = /^[a-z][a-z0-9]*(?:\.[a-z0-9][a-z0-9-]*)+$/;
// Lenient semver — major.minor.patch with optional pre-release / build metadata.
const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*$/;

export function definePlugin<M extends PluginManifestBase>(manifest: M): Readonly<M> {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("definePlugin: manifest must be an object");
  }
  const { id, name, version, dependsOn } = manifest;
  if (typeof id !== "string" || !PLUGIN_ID_RE.test(id)) {
    throw new Error(
      `definePlugin: invalid id ${JSON.stringify(id)} — use reverse-DNS form like "pagehub.seo" (lowercase, at least one dot)`
    );
  }
  if (typeof name !== "string" || !name.trim()) {
    throw new Error(`definePlugin: plugin "${id}" is missing a human-readable name`);
  }
  if (typeof version !== "string" || !SEMVER_RE.test(version)) {
    throw new Error(
      `definePlugin: plugin "${id}" has invalid version ${JSON.stringify(version)} — use semver (e.g. "0.1.0")`
    );
  }
  if (
    dependsOn !== undefined &&
    (!Array.isArray(dependsOn) || dependsOn.some(d => typeof d !== "string"))
  ) {
    throw new Error(`definePlugin: plugin "${id}" dependsOn must be an array of plugin ids`);
  }
  return Object.freeze(manifest);
}

/**
 * Collect a host's active plugin list (the body of `plugins.config.ts`). Filters
 * out skipped entries (`overlayOnly()` returns `null` when the overlay is absent),
 * rejects duplicate ids, and preserves each entry's concrete (app-narrowed) type
 * via the generic so the server loader still sees `.server`.
 */
export function definePlugins<T extends PluginManifestBase>(
  plugins: Array<T | null | undefined | false>
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const p of plugins) {
    if (!p) continue; // overlayOnly() skip sentinel / conditional inclusion
    if (seen.has(p.id)) {
      throw new Error(`definePlugins: duplicate plugin id "${p.id}" in the install list`);
    }
    seen.add(p.id);
    out.push(p);
  }
  return out;
}
