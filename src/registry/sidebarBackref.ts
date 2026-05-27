/**
 * Sidebar (settings panel) backref — module handle to the live
 * `toggleSearch` callback on `ToolbarWrapper`. Lets the registry-dispatched
 * ⌘F chord (`ph.sidebar.search`) open / close the floating settings-search
 * popup without prop drilling.
 */

export interface SidebarBackref {
  toggleSearch: () => void;
}

let sidebarRef: SidebarBackref | null = null;

export function setSidebarBackref(ref: SidebarBackref | null): void {
  sidebarRef = ref;
}

export function getSidebarBackref(): SidebarBackref | null {
  return sidebarRef;
}
