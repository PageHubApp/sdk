/**
 * BreakpointChip — single context-rich indicator next to a property label.
 *
 * Replaces the old 6-dot row in `Label.tsx`. Silent-when-clean: respects
 * `IndicatorDensityAtom` (auto / always / off) so the toolbar stays quiet
 * unless there's something to say.
 *
 * Visual states (density=auto):
 *   [hidden]      no overrides anywhere, no value at all
 *   [·]           value at base, no breakpoint overrides → silent (auto), faint hollow ring (always)
 *   [● m]         override at NON-active bp → orange dot + letter
 *   [● m]         override at ACTIVE bp → primary dot + letter
 *   [●² m]        ≥2 overrides → primary dot with badge digit "2", letter = highest non-base
 *
 * Click → opens popover (ChipPopoverAtom). Right-click → opens ChipContextMenu.
 */
import { useMemo } from "react";
import { useNode } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";

import { PAGEHUB_RTT_GLOBAL_ID } from "../../primitives/layout/tooltipSurface";
import { getPropFinalValue } from "../../viewport/state/viewportExports";
import { IndicatorDensityAtom, ViewAtom } from "../../viewport/state/atoms";
import { BP_KEYS, type BpKey } from "../../../utils/breakpointRewrite";
import {
  CHIP_BP_LABEL,
  CHIP_BP_LETTER,
  CHIP_BP_ORDER,
  ChipPopoverAtom,
  canvasViewToChipBp,
  type ChipBp,
} from "./atoms";
import { useChipContextMenu } from "./ChipContextMenu";

interface Props {
  propKey: string;
  propType?: string;
  index?: any;
  propItemKey?: string | null;
  /** Optional label string used in tooltip — falls back to propKey. */
  label?: string;
  /**
   * When true, render a faint "ghost" placeholder in the silent-when-clean state
   * (auto density + no overrides). Fades in on hover of any ancestor with
   * `group/bp-row`. Use for section-header chips where layout shift is
   * acceptable; leave false for per-input chips where a hidden chip must
   * collapse to zero width.
   */
  ghost?: boolean;
}

type BpValue = { bp: ChipBp; value: any };

function collectExplicit(
  propKey: string,
  propType: string,
  index: any,
  propItemKey: string | null | undefined,
  nodeProps: any
): BpValue[] {
  const out: BpValue[] = [];
  for (const bp of CHIP_BP_ORDER) {
    const r = getPropFinalValue(
      { propKey, propType, index: index ?? null, propItemKey: propItemKey ?? null },
      bp,
      nodeProps,
      false
    );
    // Only count it as explicit when getPropFinalValue resolved AT this bp
    // (otherwise it cascaded from base — not an override).
    if (r.viewValue === bp && r.value != null && r.value !== "") {
      out.push({ bp, value: r.value });
    }
  }
  return out;
}

function highestNonBase(explicit: BpValue[]): BpKey | null {
  // Prefer the highest breakpoint (rightmost in BP_KEYS).
  for (let i = BP_KEYS.length - 1; i >= 0; i--) {
    const k = BP_KEYS[i];
    if (explicit.some(e => e.bp === k)) return k;
  }
  return null;
}

export function BreakpointChip({
  propKey,
  propType = "class",
  index = null,
  propItemKey = null,
  label,
  ghost = false,
}: Props) {
  const { id: nodeId, nodeProps } = useNode((n: any) => ({
    id: n.id,
    nodeProps: n.data?.props,
  }));
  const density = useAtomValue(IndicatorDensityAtom);
  const view = useAtomValue(ViewAtom);
  const [popover, setPopover] = useAtomState(ChipPopoverAtom);
  const ctxMenu = useChipContextMenu({ nodeId, propKey, propType, index, propItemKey });

  const explicit = useMemo(
    () => collectExplicit(propKey, propType, index, propItemKey, nodeProps),
    [propKey, propType, index, propItemKey, nodeProps]
  );

  if (density === "off") return null;

  // Non-class props don't have a breakpoint cascade — chip is meaningless.
  if (propType === "root" || propType === "component") return null;

  const overrides = explicit.filter(e => e.bp !== "mobile");
  const overrideCount = overrides.length;
  const hasAnyValue = explicit.length > 0;

  const activeBp = canvasViewToChipBp(view); // e.g. "md" when ViewAtom = md
  const highestOverrideBp = highestNonBase(explicit);

  // `auto` (default): silent until we have at least one explicit override.
  // When the caller opts in via `ghost`, render a faint placeholder that
  // fades in on hover of any ancestor with `group/bp-row` (discoverability
  // affordance). Otherwise return null so per-input rows don't reserve
  // space for invisible chips.
  const isGhost = density === "auto" && overrideCount === 0;
  if (isGhost && !ghost) return null;

  // `always`: render even when clean — faint hollow ring at base.
  // Otherwise (auto + at least one override) render the active chip state.

  // Determine active-vs-non-active styling.
  const overrideIsAtActive =
    activeBp !== null && activeBp !== "mobile" && overrides.some(o => o.bp === activeBp);

  const showHollow = overrideCount === 0 && hasAnyValue;
  const showEmptyHollow = overrideCount === 0 && !hasAnyValue && density === "always";

  const badgeLetter =
    overrideCount === 0
      ? CHIP_BP_LETTER[(activeBp ?? "mobile") as ChipBp]
      : CHIP_BP_LETTER[(highestOverrideBp ?? "md") as ChipBp];

  const dotClass = (() => {
    if (showHollow || showEmptyHollow) {
      return "border border-base-content/40 bg-transparent opacity-30";
    }
    if (overrideIsAtActive) return "bg-primary";
    return "bg-amber-500";
  })();

  const tooltip = (() => {
    if (isGhost) return "Click to add a responsive override";
    if (!hasAnyValue) return `${label || propKey}: no value`;
    const parts = explicit.map(e => `${CHIP_BP_LABEL[e.bp]}: ${String(e.value)}`);
    return parts.join(" · ");
  })();

  const isOpen =
    popover &&
    popover.nodeId === nodeId &&
    popover.propKey === propKey &&
    popover.propType === propType &&
    (popover.index ?? null) === (index ?? null) &&
    (popover.propItemKey ?? null) === (propItemKey ?? null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      setPopover(null);
      return;
    }
    setPopover({
      nodeId,
      propKey,
      propType,
      index: index ?? null,
      propItemKey: propItemKey ?? null,
      pulseBp: null,
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctxMenu.open(e.clientX, e.clientY);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content={tooltip}
        data-tooltip-place="top"
        data-tooltip-offset={6}
        data-ph-bp-chip
        data-ph-node-id={nodeId}
        data-ph-prop-key={propKey}
        aria-label={`Breakpoint overrides for ${label || propKey}`}
        aria-expanded={!!isOpen}
        className={`relative inline-flex h-3.5 min-w-[14px] cursor-pointer items-center justify-center gap-0.5 rounded-[3px] px-[3px] transition-[colors,opacity] duration-150 ${
          isOpen ? "bg-base-200" : "hover:bg-base-200"
        } ${isGhost ? "opacity-0 group-hover/bp-row:opacity-40 hover:!opacity-100" : ""}`}
      >
        <span
          className={`inline-block size-[6px] shrink-0 rounded-full ${
            isGhost ? "border-base-content/50 border bg-transparent" : dotClass
          }`}
          aria-hidden
        />
        {showHollow || showEmptyHollow || isGhost ? null : (
          <span className="text-base-content font-mono text-[9px] leading-none" aria-hidden>
            {badgeLetter}
          </span>
        )}
        {overrideCount >= 2 && (
          <span
            className="bg-primary text-primary-content absolute -top-1 -right-1 inline-flex size-3 items-center justify-center rounded-full font-mono text-[8px] leading-none"
            aria-hidden
          >
            {overrideCount}
          </span>
        )}
      </button>
      {ctxMenu.menu}
    </>
  );
}
