/**
 * The row above the settings panel: the path to the selected element
 * (`NodeBreadcrumb`), or the component picker while a reusable component's
 * canvas is open. The default sidebar renders it under its header; a host
 * using `layout="none"` places it above `EditorInspector`.
 */
import { useAtomValue } from "@zedux/react";
import React from "react";
import { ViewModeAtom } from "../../../utils/atoms";
import { ComponentSelector } from "../pickers/ComponentSelector";
import { NodeBreadcrumb } from "./NodeBreadcrumb";

export function EditorBreadcrumb({
  showPageSelector = true,
}: {
  /** Lead the path with the inline page switcher. Off when the host shows its own. */
  showPageSelector?: boolean;
}): React.JSX.Element {
  const viewMode = useAtomValue(ViewModeAtom);
  return viewMode === "canvas" ? (
    <div className="border-base-300 flex h-10 min-h-10 shrink-0 items-center border-b px-3 py-0">
      <ComponentSelector className="w-full" />
    </div>
  ) : (
    <NodeBreadcrumb showPageSelector={showPageSelector} />
  );
}
