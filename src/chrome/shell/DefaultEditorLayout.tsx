/**
 * The editor's own arrangement (`layout="default"`, a standalone full-window editor): the save
 * banner on top, the settings sidebar (`Toolbar`: header, breadcrumb, Add /
 * Theme drawer, inspector, docked layers) beside the canvas, and the host's
 * docked AI panel under the canvas.
 *
 * Built from the same pieces a host gets with `layout="none"`, so there is one
 * implementation of each.
 */
import React from "react";
import { useSDK } from "../../core/context";
import { Toolbar } from "../toolbar";
import { EditorCanvas } from "./EditorCanvas";
import { EditorSaveBanner } from "./EditorSaveBanner";

export function DefaultEditorLayout(): React.JSX.Element {
  const { readOnly, config } = useSDK();
  const showSidebar = config.features?.sidebar !== false;

  return (
    <div
      className="bg-base-100 text-base-content relative flex h-full min-h-0 w-full flex-col overflow-hidden"
      data-base={true}
    >
      {!readOnly && <EditorSaveBanner />}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        {/* Settings sidebar */}
        {showSidebar && !readOnly && <Toolbar />}

        {/* Canvas + docked AI panel column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <EditorCanvas />
          {!readOnly && config.features?.aiGeneration && config.aiPanel}
        </div>
      </div>
    </div>
  );
}
