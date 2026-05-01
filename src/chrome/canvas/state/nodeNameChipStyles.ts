/** Shared shell for canvas node name labels (selected strip + hover read-only).
 *  The `ph-node-name-chip` token is a CSS hook used by ComponentCanvasViewport
 *  to hide these chips in canvas mode (the per-card drag handle label
 *  replaces them — two labels per node would duplicate). */
export const NODE_NAME_CHIP_SHELL_CLASS =
  "ph-node-name-chip fontfamily-base pointer-events-auto flex flex-row gap-3 overflow-hidden border-current bg-base-100 px-2 text-xs! font-normal! text-base-content";
