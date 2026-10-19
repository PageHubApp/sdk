import type { PageHubFeatures } from "../../../types";

/**
 * `features.maxReusableComponents` — how many reusable components (the
 * `type: "component"` containers directly under ROOT) a host lets a site hold.
 * Unset or null = no cap. Hosts gate it on their own plans; the editor only
 * refuses to make one more.
 */

/** The notice shown when a create is refused at the cap. */
export function componentCapMessage(max: number): string {
  const many = max === 1 ? "1 per site" : `${max.toLocaleString()} per site`;
  return `Reusable components are ${many} on this plan. Delete one to make another, or upgrade the site's plan.`;
}

/** Reusable components among ROOT's children, read through `typeOf(id)` (the node's `props.type`). */
export function countReusableComponents(
  rootChildIds: readonly string[] | null | undefined,
  typeOf: (id: string) => unknown
): number {
  let n = 0;
  for (const id of rootChildIds || []) if (typeOf(id) === "component") n++;
  return n;
}

/** Room for one more under the cap? A missing or null cap never blocks. */
export function canAddReusableComponent(
  count: number,
  max: PageHubFeatures["maxReusableComponents"]
): boolean {
  if (typeof max !== "number" || !Number.isFinite(max)) return true;
  return count < max;
}

/** Count the live editor's reusable components through a CraftJS `query`. 0 when it can't be read. */
export function countEditorReusableComponents(query: any): number {
  try {
    const rootKids: string[] = query?.node("ROOT")?.get()?.data?.nodes || [];
    return countReusableComponents(rootKids, id => {
      try {
        return query.node(id).get()?.data?.props?.type;
      } catch {
        return undefined;
      }
    });
  } catch {
    return 0;
  }
}

/** Is the live editor at the host's cap? Never true while the host sets none. */
export function editorAtComponentCap(
  query: any,
  max: PageHubFeatures["maxReusableComponents"]
): boolean {
  if (typeof max !== "number") return false;
  return !canAddReusableComponent(countEditorReusableComponents(query), max);
}
