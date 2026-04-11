import { useSyncExternalStore } from "react";

/** Matches Tailwind `md` (768px): below this, settings toolbar is overlay (out of flex flow). */
const MEDIA_QUERY = "(max-width: 767px)";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(MEDIA_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MEDIA_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/** True when the editor chrome should use overlay (absolute) settings toolbar instead of docked flex column. */
export function useEditorToolbarOverlayLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
