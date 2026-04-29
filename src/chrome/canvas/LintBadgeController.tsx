import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "react-tooltip";
import { TbAlertTriangle, TbCircleX, TbWand } from "react-icons/tb";
import { lintNode, maxSeverity, type LintIssue } from "../../utils/lint/responsiveLint";
import { OVERLAY_Z_LINT_BADGE, OVERLAY_Z_TOOLTIP } from "../overlays/overlayZIndex";
import { getPortalTarget } from "../overlays/getPortalTarget";

/**
 * Persistent responsive-lint badge — always visible (no hover/select gate)
 * when the node has lint issues. Pinned to the top-left corner of the node's
 * actual rendered DOM via fixed positioning + getBoundingClientRect, updated
 * on scroll/resize and on selection events.
 */
export const LintBadgeController = () => {
  const { nodeId, lintClassName, lintChildCount, lintIgnore, dom } = useNode(node => ({
    nodeId: node.id,
    lintClassName: (node.data.props?.className as string) || "",
    lintChildCount: node.data.nodes?.length ?? 0,
    lintIgnore: node.data.custom?.lintIgnore,
    dom: node.dom as HTMLElement | null,
  }));

  const { actions } = useEditor();

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
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!severity || !dom || !badgeRef.current) return;

    let animFrameId: number;

    const updatePos = () => {
      if (!badgeRef.current) return;
      const r = dom.getBoundingClientRect();
      badgeRef.current.style.left = `${r.left - 6}px`;
      badgeRef.current.style.top = `${r.top - 6}px`;
      animFrameId = requestAnimationFrame(updatePos);
    };

    updatePos();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [severity, dom]);

  if (!severity || typeof document === "undefined") return null;

  const badgeId = `lint-badge-${nodeId}`;

  const handleFix = (issue: LintIssue) => {
    if (!issue.fix) return;
    actions.setProp(nodeId, (props: any) => {
      const tokens = (props.className || "").split(/\s+/).filter(Boolean);
      const removed = new Set(issue.fix!.remove ?? []);
      const next = tokens.filter((t: string) => !removed.has(t));
      for (const cls of issue.fix!.add ?? []) {
        if (!next.includes(cls)) next.push(cls);
      }
      props.className = next.join(" ");
    });
  };

  return createPortal(
    <>
      <span
        ref={badgeRef}
        id={badgeId}
        style={{
          position: "fixed",
          zIndex: OVERLAY_Z_LINT_BADGE,
        }}
        className={`pointer-events-auto block size-3 rounded-full ring-2 ring-white shadow-md ${
          severity === "error" ? "bg-red-500" : "bg-yellow-500"
        }`}
        aria-label={`${issues.length} responsive ${issues.length === 1 ? "issue" : "issues"}`}
      />
      <Tooltip
        anchorSelect={`#${badgeId}`}
        place="top"
        clickable
        className="rounded-lg! border! border-base-300! bg-base-100! p-0! shadow-lg!"
        style={{ zIndex: OVERLAY_Z_TOOLTIP }}
        render={() => <LintTooltip issues={issues} onFix={handleFix} />}
      />
    </>,
    getPortalTarget()
  );
};

function LintTooltip({
  issues,
  onFix,
}: {
  issues: LintIssue[];
  onFix: (issue: LintIssue) => void;
}) {
  return (
    <div className="flex max-w-[260px] cursor-default flex-col divide-y divide-base-300">
      {issues.map((issue, i) => (
        <div key={i} className="flex flex-col gap-1 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            {issue.severity === "error" ? (
              <TbCircleX className="size-3 shrink-0 text-error" />
            ) : (
              <TbAlertTriangle className="size-3 shrink-0 text-warning" />
            )}
            <span className="text-[11px] font-semibold text-base-content">{issue.title}</span>
          </div>
          <p className="text-xs leading-snug text-base-content/70">{issue.message}</p>
          {issue.tip && (
            <p className="text-xs leading-snug text-base-content/50">{issue.tip}</p>
          )}
          {issue.fix && (
            <button
              type="button"
              onClick={() => onFix(issue)}
              className="mt-1 flex w-fit items-center gap-1 rounded-md border border-base-300 bg-base-200 px-2 py-1 text-[11px] font-medium text-base-content transition-colors hover:bg-base-300"
            >
              <TbWand className="size-3" />
              Apply fix
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
