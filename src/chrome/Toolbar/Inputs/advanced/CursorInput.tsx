// @ts-nocheck
import { UniversalInput } from "../UniversalInput";

// Popular cursors first, then less common ones
const CURSOR_OPTIONS = {
  popular: [
    "cursor-auto",
    "cursor-default",
    "cursor-pointer",
    "cursor-wait",
    "cursor-text",
    "cursor-move",
    "cursor-not-allowed",
    "cursor-grab",
    "cursor-grabbing",
  ],
  other: [
    "cursor-help",
    "cursor-none",
    "cursor-context-menu",
    "cursor-progress",
    "cursor-cell",
    "cursor-crosshair",
    "cursor-vertical-text",
    "cursor-alias",
    "cursor-copy",
    "cursor-no-drop",
    "cursor-all-scroll",
    "cursor-col-resize",
    "cursor-row-resize",
    "cursor-n-resize",
    "cursor-e-resize",
    "cursor-s-resize",
    "cursor-w-resize",
    "cursor-ne-resize",
    "cursor-nw-resize",
    "cursor-se-resize",
    "cursor-sw-resize",
    "cursor-ew-resize",
    "cursor-ns-resize",
    "cursor-nesw-resize",
    "cursor-nwse-resize",
    "cursor-zoom-in",
    "cursor-zoom-out",
  ],
};

export const CursorInput = () => (
  <UniversalInput
    propKey="cursor"
    propType="class"
    propTag="cursor"
    tailwindOptions={[...CURSOR_OPTIONS.popular, ...CURSOR_OPTIONS.other]}
    allowedTypes={["tailwind", "calc"]}
    label="Cursor"
    showVarSelector={true}
    inline
  />
);
