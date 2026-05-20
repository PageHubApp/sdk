import type { ToHTMLFn } from "../../utils/staticHtml";

// MapPoint data is encoded into the parent Map's `data-ph-map` JSON,
// so the point itself emits nothing in static HTML.
export const toHTML: ToHTMLFn = () => "";
