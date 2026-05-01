/** Shared bar height for search + segmented controls in the Media toolbar. */
export const TOOLBAR_BAR_H = "h-8";

/** tool-bg-flat (not tool-bg) so clusters match the bar — no shadow-xl. */
export const TOOL_CLUSTER_CLASS = `tool-bg-flat ${TOOLBAR_BAR_H} shrink-0 !items-stretch !justify-start !gap-0.5 !px-0 !py-0 text-neutral-content [&_button.tool-button]:h-full [&_button.tool-button]:min-h-0 [&_button.tool-button]:rounded-sm [&_button.tool-button]:px-1.5`;
