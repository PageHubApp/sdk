/**
 * ROOT-level chrome suppression — the active page can opt out of the global
 * header / footer (or all chrome) via `hideHeader` / `hideFooter` / `hideChrome`
 * on its own props. With sharding only the active page sits in `ROOT.nodes`, so
 * we read its flags and strip the matching header/footer siblings before
 * recursing.
 *
 * Shared by the React renderer (`render/react/RenderTree`) and the static-export
 * walker (`render/static/walker`) so the two routes always agree — the URL
 * doesn't tell you which one is running, so this MUST stay single-source.
 *
 * The two walkers use different `SerializedNode` types; this helper stays
 * decoupled from both by reading props through a caller-supplied getter.
 */
interface ChromeProps {
  type?: unknown;
  hideHeader?: unknown;
  hideFooter?: unknown;
  hideChrome?: unknown;
}

export function filterChromeChildren(
  childIds: string[],
  getProps: (id: string) => ChromeProps | undefined
): string[] {
  const activePage = childIds.map(getProps).find((p) => p?.type === "page");
  const hideHeader = activePage?.hideHeader === true;
  const hideFooter = activePage?.hideFooter === true;
  const hideChrome = activePage?.hideChrome === true;
  if (!hideHeader && !hideFooter && !hideChrome) return childIds;

  return childIds.filter((id) => {
    const type = getProps(id)?.type;
    if (hideChrome && type !== "page") return false;
    if (hideHeader && type === "header") return false;
    if (hideFooter && type === "footer") return false;
    return true;
  });
}
