import { useNode } from "@craftjs/core";
import { ToolbarItem } from "../../ToolbarItem";

/**
 * CSS overflow UX for Container — horizontal drag scroll + auto-hide scrollbar.
 * Distinct from GSAP "Scroll Effect" (pin / horizontal-scroll section).
 */
export function ContainerOverflowSection() {
  const { craftName, scrollEffect, overflowDragScroll, overflowAutoHideScrollbar } = useNode(
    node => {
      const p = node.data?.props || {};
      return {
        craftName: node.data?.name || node.data?.displayName,
        scrollEffect: p.scrollEffect,
        overflowDragScroll: p.overflowDragScroll,
        overflowAutoHideScrollbar: p.overflowAutoHideScrollbar,
      };
    }
  );

  if (craftName !== "Container") return null;

  const gsapHorizontal = scrollEffect === "horizontal-scroll";

  if (gsapHorizontal) {
    return (
      <p className="text-neutral-content text-xs leading-relaxed">
        CSS overflow options are disabled while{" "}
        <span className="text-base-content font-medium">Scroll Effect → Horizontal Scroll</span>{" "}
        (GSAP) is on. Use one or the other.
      </p>
    );
  }

  return (
    <>
      <ToolbarItem
        propKey="overflowDragScroll"
        propType="component"
        type="toggle"
        label="Drag to scroll (published)"
        labelWidth="w-56"
        on={true}
      />
      <ToolbarItem
        propKey="overflowAutoHideScrollbar"
        propType="component"
        type="toggle"
        label="Auto-hide scrollbar"
        labelWidth="w-56"
        on={true}
      />
      {(overflowDragScroll || overflowAutoHideScrollbar) && (
        <>
          {overflowDragScroll && (
            <>
              <ToolbarItem
                propKey="overflowDragScrollSmoothing"
                propType="component"
                type="select"
                label="Drag feel"
                labelWidth="w-56"
                valueCoalesce={0}
              >
                <option value="0">Direct (1:1 with pointer)</option>
                <option value="0.12">Light ease</option>
                <option value="0.2">Fluid</option>
                <option value="0.28">Very fluid</option>
              </ToolbarItem>
              <ToolbarItem
                propKey="overflowWheelScrollsHorizontal"
                propType="component"
                type="toggle"
                label="Vertical wheel scrolls horizontally"
                labelWidth="w-56"
                on={true}
              />
            </>
          )}
          {overflowAutoHideScrollbar && (
            <ToolbarItem
              propKey="overflowScrollbarHideDelay"
              propType="component"
              type="number"
              label="Scrollbar hide delay (ms)"
              labelWidth="w-56"
              valueCoalesce={1000}
            />
          )}
        </>
      )}
      <p className="text-neutral-content text-xs leading-relaxed">
        <span className="text-base-content font-medium">overflow-x-auto</span> is added
        automatically unless you set another{" "}
        <span className="text-base-content font-medium">overflow-x-*</span> in Classes. Use a
        horizontal row (e.g. flex) for your strip. Drag scroll runs on the live site only, not while
        editing the canvas. If motion feels like it snaps to cards, remove{" "}
        <span className="text-base-content font-medium">scroll-snap-*</span> from Classes on this
        container or its children.
      </p>
    </>
  );
}
