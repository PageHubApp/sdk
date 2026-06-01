import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import {
  TbHeading,
  TbLayoutAlignLeft,
  TbLayoutAlignTop,
  TbLayoutGridAdd,
  TbTextSize,
} from "react-icons/tb";
import { CanvasZoom } from "./CanvasZoom";
import { ComponentCanvasZoomAtom } from "../state/atoms";

interface CanvasFloatingToolbarProps {
  /** Truthy while a component is isolated — collapses the toolbar to just zoom. */
  isolated: boolean;
  /** Count of cards on the canvas (component label). */
  componentCount: number;
  onCreateComponent: () => void;
  onArrange: (axis: "horizontal" | "vertical") => void;
  onAddAnnotation: (kind: "label" | "title") => void;
}

/** Floating top-right toolbar for the component canvas (new / arrange / annotate / zoom). */
export function CanvasFloatingToolbar({
  isolated,
  componentCount,
  onCreateComponent,
  onArrange,
  onAddAnnotation,
}: CanvasFloatingToolbarProps) {
  return (
    <div className="bg-neutral/95 pointer-events-auto absolute top-3 right-3 z-50 flex items-center gap-2 rounded-md px-3 py-2 shadow-lg backdrop-blur-sm">
      {!isolated && (
        <>
          <span className="text-neutral-content/70 px-1 text-xs">
            {componentCount} {componentCount === 1 ? "component" : "components"}
          </span>
          <div className="bg-base-content/20 h-4 w-px" />
          <button
            type="button"
            onClick={onCreateComponent}
            className="hover:bg-neutral text-neutral-content rounded p-1.5"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="New component"
            data-tooltip-place="bottom"
            data-tooltip-offset={6}
            aria-label="New component"
          >
            <TbLayoutGridAdd className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onArrange("horizontal")}
            className="hover:bg-neutral text-neutral-content rounded p-1.5"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Arrange in a row"
            data-tooltip-place="bottom"
            data-tooltip-offset={6}
            aria-label="Arrange horizontally"
          >
            <TbLayoutAlignTop className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onArrange("vertical")}
            className="hover:bg-neutral text-neutral-content rounded p-1.5"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Arrange in a column"
            data-tooltip-place="bottom"
            data-tooltip-offset={6}
            aria-label="Arrange vertically"
          >
            <TbLayoutAlignLeft className="size-4" />
          </button>
          <div className="bg-base-content/20 h-4 w-px" />
          <button
            type="button"
            onClick={() => onAddAnnotation("label")}
            className="hover:bg-neutral text-neutral-content rounded p-1.5"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Add label"
            data-tooltip-place="bottom"
            data-tooltip-offset={6}
            aria-label="Add label"
          >
            <TbTextSize className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onAddAnnotation("title")}
            className="hover:bg-neutral text-neutral-content rounded p-1.5"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Add title"
            data-tooltip-place="bottom"
            data-tooltip-offset={6}
            aria-label="Add title"
          >
            <TbHeading className="size-4" />
          </button>
          <div className="bg-base-content/20 h-4 w-px" />
        </>
      )}
      <CanvasZoom
        zoomAtom={ComponentCanvasZoomAtom}
        fitMode={{ kind: "width", target: 2400, max: 2 }}
        activeKey="component-canvas"
        storageKey="editor-component-canvas-zoom"
      />
    </div>
  );
}
