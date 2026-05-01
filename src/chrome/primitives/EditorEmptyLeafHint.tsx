/**
 * Editor-only entry for the empty-leaf hint: `React.lazy` loads
 * `EditorEmptyLeafHintView` so viewer/static bundles do not pull
 * react-icons / tooltip chrome. Import **this** module from Craft
 * components — never static-import `EditorEmptyLeafHintView` from
 * selector files (see check-sdk-cycles.mjs).
 */
import React from "react";
import type { EditorEmptyLeafHintProps } from "./EditorEmptyLeafHintView";

export type { EditorEmptyLeafHintProps } from "./EditorEmptyLeafHintView";

const EditorEmptyLeafHintViewLazy = React.lazy(() =>
  import("./EditorEmptyLeafHintView").then(mod => ({
    default: mod.EditorEmptyLeafHintView,
  }))
);

/** Canvas empty-state for leaf components: fills available space and centers a compact label. */
export function EditorEmptyLeafHint(props: EditorEmptyLeafHintProps) {
  return (
    <React.Suspense fallback={null}>
      <EditorEmptyLeafHintViewLazy {...props} />
    </React.Suspense>
  );
}
