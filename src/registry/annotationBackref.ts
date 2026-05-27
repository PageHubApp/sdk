/**
 * Annotation layer backref — module-level handle to the live
 * `CanvasAnnotationLayer`'s delete callback so `ph.annotation.delete` can
 * drive it from the registry dispatcher without prop drilling.
 *
 * Same shape as `editorBackref.ts` / `mediaBackref.ts`. Cleared on layer
 * unmount so a stale ref doesn't fire after the canvas detaches.
 */

export interface AnnotationBackref {
  deleteSelected: () => void;
}

let annotationRef: AnnotationBackref | null = null;

export function setAnnotationBackref(ref: AnnotationBackref | null): void {
  annotationRef = ref;
}

export function getAnnotationBackref(): AnnotationBackref | null {
  return annotationRef;
}
