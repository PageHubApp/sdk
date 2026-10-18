/**
 * The page being edited: the canvas viewport (breakpoints, device frames,
 * zoom, side-by-side, scope band) with Craft's `<Frame />` inside it, or the
 * loader until the initial document is in.
 *
 * Fills its parent as a flex column, so give it a sized box. The document
 * itself loads in `EditorServices`, so this can be placed, hidden or remounted
 * freely. Render it only once per editor: it owns `#viewport`.
 */
import { Frame } from "@craftjs/core";
import React from "react";
import { Viewport } from "../viewport/Viewport/Viewport";
import { EditorLoader } from "./EditorLoader";
import { useEditorDocumentLoaded } from "./useEditorDocument";

function EditorFrame({ loading }: { loading?: React.ReactNode }) {
  if (useEditorDocumentLoaded()) return <Frame />;
  return loading !== undefined ? <>{loading}</> : <EditorLoader />;
}

export function EditorCanvas({
  loading,
}: {
  /** Shown until the page is in. Defaults to the SDK's spinner. */
  loading?: React.ReactNode;
} = {}): React.JSX.Element {
  return (
    <Viewport>
      <EditorFrame loading={loading} />
    </Viewport>
  );
}
