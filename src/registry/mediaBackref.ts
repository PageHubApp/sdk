/**
 * Media Manager backref — module-level handle to the live media manager's
 * `selectAllVisible` / `handleDeleteSelected` callbacks plus current
 * selectionCount. Captured by the active `useMediaManager` instance via
 * `useRegisterMediaContext` so the registry-dispatched commands
 * (`ph.media.selectAll`, `ph.media.deleteSelected`) can reach them without
 * routing every chord through component props.
 *
 * Same shape as `editorBackref.ts` / `tiptapBackref.ts` — the registry never
 * imports React; one module ref + a tiny hook on the surface side.
 */

export interface MediaBackref {
  selectAllVisible: () => void;
  handleDeleteSelected: () => void;
}

let mediaRef: MediaBackref | null = null;

export function setMediaBackref(ref: MediaBackref | null): void {
  mediaRef = ref;
}

export function getMediaBackref(): MediaBackref | null {
  return mediaRef;
}
