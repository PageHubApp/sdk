/**
 * Component allowlist — host-configured filter over the editor's component catalog.
 *
 * The inverse of `PageHubFeatures.restrictedComponents` (a deny-list). When an
 * allowlist is set, the toolbox + AI/MCP integrations should only see the listed
 * component names. Useful for constrained editor modes (e.g. email) that want to
 * start from nothing and opt in to a small set.
 *
 * See docs/sdk/host-constraints.md.
 *
 * Set via `registerComponentAllowlist`; cleared via `resetComponentAllowlist` or
 * by passing an empty array. Same single-instance contract as the other runtime
 * registries (apiConfig, cssAllowlist).
 */

let allowlist: ReadonlySet<string> | null = null;

/**
 * Restrict the editor's component catalog to the named components. Pass an empty
 * array (or call `resetComponentAllowlist`) to clear and fall back to no filter.
 *
 * Idempotent — last call wins. Built-in components and host-supplied custom
 * components are filtered against the same name set.
 */
export function registerComponentAllowlist(names: string[]): void {
  if (!Array.isArray(names) || names.length === 0) {
    allowlist = null;
    return;
  }
  allowlist = new Set(names);
}

export function resetComponentAllowlist(): void {
  allowlist = null;
}

/** Returns the current allowlist, or `null` when no filter is active. */
export function getComponentAllowlist(): ReadonlySet<string> | null {
  return allowlist;
}

/**
 * Check whether a component name passes the current allowlist.
 * Always returns `true` when no allowlist is set.
 */
export function isComponentAllowed(name: string): boolean {
  return allowlist === null || allowlist.has(name);
}
