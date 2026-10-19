import type { PageHubFeatures } from "../../../types";

/**
 * `features.componentBoard` — whether the components editor mounts the spatial
 * board and offers the page/components toggle. On unless a host sets `false`.
 */
export function componentBoardEnabled(
  features: Pick<PageHubFeatures, "componentBoard"> | null | undefined
): boolean {
  return features?.componentBoard !== false;
}
