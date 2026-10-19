/**
 * Install an editor's host constraints (`features.componentAllowlist`,
 * `features.catalogFilters`) into the runtime registries. Replaces whatever
 * was set before: an unset allowlist clears it, and every earlier catalog
 * filter is dropped. `<PageHubEditor>` calls this while rendering, so the
 * mounted editor's own constraints are the ones in force.
 *
 * See docs/sdk/host-constraints.md.
 */
import type { PageHubFeatures } from "../types/features";
import { registerCatalogFilter, resetCatalogFilter } from "./catalogRegistry";
import { registerComponentAllowlist } from "./componentAllowlist";

export function applyHostConstraints(
  features: Pick<PageHubFeatures, "componentAllowlist" | "catalogFilters">
): void {
  registerComponentAllowlist(features.componentAllowlist ?? []);
  resetCatalogFilter();
  for (const [name, fn] of Object.entries(features.catalogFilters ?? {})) {
    registerCatalogFilter(name, fn);
  }
}
