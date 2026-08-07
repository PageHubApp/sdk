import type { ToHTMLFn } from "../../utils/staticHtml";

// MapPath data is encoded into the parent Map's `data-ph-map` JSON and drawn as
// an inline SVG overlay by Map.toHTML, so the path itself emits nothing.
export const toHTML: ToHTMLFn = () => "";
