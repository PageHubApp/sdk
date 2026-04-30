/**
 * Lazy wrapper around `chrome/primitives/EditorEmptyLeafHint`.
 *
 * Runtime components (Container, Button, Audio, …) render the empty-leaf
 * hint only when CraftJS is in editor mode (`enabled`), but a static
 * `import { EditorEmptyLeafHint } from "../chrome/..."` drags the editor
 * primitive (and its react-icons / overlay-z transitives) into every
 * viewer / static-export bundle. We split it out behind `React.lazy` so
 * the chunk only loads when the editor mounts a CraftJS canvas.
 *
 * Usage is a drop-in replacement for `<EditorEmptyLeafHint …/>` — the
 * `<Suspense fallback={null}>` lives inside this component, so call sites
 * stay one line. The fallback is intentionally null because the hint is
 * decorative editor chrome; a brief blank during chunk load is harmless.
 *
 * The `chrome/`-prefixed import is fine here because the only consumers
 * of this file are runtime components, and the dynamic `import()` keeps
 * it out of the static viewer graph (verified by check-sdk-cycles.mjs).
 */
import React from "react";
import type { EditorEmptyLeafHintProps } from "../chrome/primitives/EditorEmptyLeafHint";

const EditorEmptyLeafHint = React.lazy(() =>
  import("../chrome/primitives/EditorEmptyLeafHint").then(mod => ({
    default: mod.EditorEmptyLeafHint,
  }))
);

export function LazyEditorEmptyLeafHint(props: EditorEmptyLeafHintProps) {
  return (
    <React.Suspense fallback={null}>
      <EditorEmptyLeafHint {...props} />
    </React.Suspense>
  );
}
