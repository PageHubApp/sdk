/**
 * Sections-settings modal backref — module handle to the live quick-look
 * toggle on `CategoryDetailView`. Lets the registry-dispatched Space chord
 * (`ph.sections.toggleQuickLook`) drive it without reaching through React.
 *
 * Same shape as editorBackref / mediaBackref / annotationBackref.
 */

export interface SectionsBackref {
  toggleQuickLook: () => void;
}

let sectionsRef: SectionsBackref | null = null;

export function setSectionsBackref(ref: SectionsBackref | null): void {
  sectionsRef = ref;
}

export function getSectionsBackref(): SectionsBackref | null {
  return sectionsRef;
}
