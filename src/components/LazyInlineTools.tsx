/**
 * Lazy InlineToolsRenderer — renders nothing on viewer pages,
 * dynamically loads the real implementation on editor pages.
 */
import React from "react";

const RealInlineToolsRenderer = React.lazy(() =>
  import("../chrome/InlineToolsRenderer").then(m => ({ default: m.InlineToolsRenderer }))
);

export const InlineToolsRenderer = (props: any) => (
  <React.Suspense fallback={null}>
    <RealInlineToolsRenderer {...props} />
  </React.Suspense>
);
