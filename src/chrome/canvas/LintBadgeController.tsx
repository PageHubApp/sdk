import { useNode } from "@craftjs/core";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { lintNode, maxSeverity } from "../../utils/lint/responsiveLint";

/**
 * Persistent responsive-lint badge — always visible (no hover/select gate)
 * when the node has lint issues. Pinned to the top-left corner of the node's
 * actual rendered DOM via fixed positioning + getBoundingClientRect, updated
 * on scroll/resize and on selection events.
 */
export const LintBadgeController = () => {
  const { lintClassName, lintChildCount, lintIgnore, dom } = useNode(node => ({
    lintClassName: (node.data.props?.className as string) || "",
    lintChildCount: node.data.nodes?.length ?? 0,
    lintIgnore: node.data.custom?.lintIgnore,
    dom: node.dom as HTMLElement | null,
  }));

  const issues = useMemo(
    () =>
      lintNode({
        data: {
          props: { className: lintClassName },
          nodes: new Array(lintChildCount),
          custom: { lintIgnore },
        },
      }),
    [lintClassName, lintChildCount, lintIgnore]
  );
  const severity = maxSeverity(issues);

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!severity || !dom) return;
    const compute = () => {
      const r = dom.getBoundingClientRect();
      // Anchor at top-left corner of the node, just outside (above-left).
      setPos({ x: r.left - 6, y: r.top - 6 });
    };
    compute();
    const viewport = document.getElementById("viewport");
    viewport?.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    const ro = new ResizeObserver(compute);
    ro.observe(dom);
    return () => {
      viewport?.removeEventListener("scroll", compute);
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
      ro.disconnect();
    };
  }, [severity, dom]);

  if (!severity || !pos || typeof document === "undefined") return null;

  return createPortal(
    <span
      style={{
        position: "fixed",
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 9998,
      }}
      className={`pointer-events-auto block size-3 rounded-full ring-2 ring-white shadow-md ${
        severity === "error" ? "bg-red-500" : "bg-yellow-500"
      }`}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={issues.map(i => `• ${i.message}`).join("\n")}
      data-tooltip-place="top"
      aria-label={`${issues.length} responsive ${issues.length === 1 ? "issue" : "issues"}`}
    />,
    document.body
  );
};
