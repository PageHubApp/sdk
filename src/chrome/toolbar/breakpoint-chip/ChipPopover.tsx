/**
 * ChipPopover — singleton popover spawned by ChipPopoverAtom.
 *
 * Mounted ONCE near the editor root. Reads the active chip ref from
 * `ChipPopoverAtom`, finds the matching chip DOM element via a data-attr
 * query, and anchors a Floating-UI popover to it. Renders a 6-cell grid
 * (base + sm | md | lg | xl | 2xl) of the property's values; clicking a cell
 * changes `ViewAtom` to that bp; alt-clicking toggles `MultiScopeAtom`.
 */
import { useEffect, useMemo, useState } from "react";
import { useEditor } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";

import { AnchoredPopover } from "../../overlays/AnchoredPopover";
import { ViewAtom } from "../../viewport/atoms";
import type { ViewMode } from "../../../core/store";
import { getPropFinalValue } from "../../viewport/viewportExports";
import { BP_KEYS, type BpKey } from "../../../utils/breakpointRewrite";
import {
  CHIP_BP_LABEL,
  CHIP_BP_LETTER,
  CHIP_BP_ORDER,
  ChipPopoverAtom,
  type ChipPopoverState,
  MultiScopeAtom,
  canvasViewToChipBp,
  type ChipBp,
} from "./atoms";

function selectorFor(state: NonNullable<ChipPopoverState>) {
  return (
    `[data-ph-bp-chip]` +
    `[data-ph-node-id="${CSS.escape(state.nodeId)}"]` +
    `[data-ph-prop-key="${CSS.escape(state.propKey)}"]`
  );
}

/** Map chip bp → ViewAtom value. `mobile` <-> `mobile`. */
function bpToViewMode(bp: ChipBp): ViewMode {
  return bp as ViewMode;
}

export function ChipPopover() {
  const [popover, setPopover] = useAtomState(ChipPopoverAtom);
  const [view, setView] = useAtomState(ViewAtom);
  const [multi, setMulti] = useAtomState(MultiScopeAtom);
  const { query } = useEditor();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pulseTick, setPulseTick] = useState(0);

  // Resolve anchor element each time popover opens. Re-find on mount because
  // the chip might have been freshly rendered by the open-click.
  useEffect(() => {
    if (!popover) {
      setAnchor(null);
      return;
    }
    const el = document.querySelector(selectorFor(popover)) as HTMLElement | null;
    setAnchor(el);
  }, [popover]);

  // Pulse the source-bp cell for ~1.5s when triggered (Show source command).
  useEffect(() => {
    if (!popover?.pulseBp) return;
    setPulseTick(t => t + 1);
    const id = window.setTimeout(() => {
      // Clear the pulseBp marker so subsequent opens don't re-pulse.
      setPopover(prev => (prev ? { ...prev, pulseBp: null } : prev));
    }, 1600);
    return () => window.clearTimeout(id);
  }, [popover?.pulseBp, setPopover]);

  const node = popover ? query.node(popover.nodeId).get() : null;
  const nodeProps = node?.data?.props ?? {};

  // Read every cell value once.
  const cells = useMemo(() => {
    if (!popover) return [];
    return CHIP_BP_ORDER.map(bp => {
      const r = getPropFinalValue(
        {
          propKey: popover.propKey,
          propType: popover.propType,
          index: popover.index ?? null,
          propItemKey: popover.propItemKey ?? null,
        },
        bp,
        nodeProps,
        false
      );
      const explicit = r.viewValue === bp && r.value != null && r.value !== "";
      return { bp, value: explicit ? r.value : null, explicit };
    });
  }, [popover, nodeProps]);

  if (!popover) return null;
  const activeBp: ChipBp | null = canvasViewToChipBp(view);
  const isMulti = multi.size > 0;

  const onCellClick = (bp: ChipBp, e: React.MouseEvent) => {
    if (e.altKey) {
      // Toggle in MultiScopeAtom (only valid for non-mobile bps).
      if (bp === "mobile") return;
      const next = new Set(multi);
      if (next.has(bp as BpKey)) next.delete(bp as BpKey);
      else next.add(bp as BpKey);
      setMulti(next);
      return;
    }
    // Plain click → switch canvas view to that bp; the rule is "scope = canvas".
    setView(bpToViewMode(bp));
  };

  const clearMulti = () => setMulti(new Set());

  return (
    <AnchoredPopover
      open={!!popover && !!anchor}
      onOpenChange={open => {
        if (!open) setPopover(null);
      }}
      anchor={anchor}
      placement="bottom"
      mainAxisOffset={4}
      className="pagehub-sdk-root border-base-300 bg-base-100 text-base-content rounded-xl border p-2 shadow-xl"
      style={{ minWidth: 220 }}
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <span className="text-base-content text-[11px] font-semibold">
          {popover.propKey}
        </span>
        <span className="text-neutral-content text-[9px]">
          alt-click = multi
        </span>
      </div>
      {isMulti && (
        <div className="bg-primary/10 text-primary mb-1 flex items-center justify-between gap-2 rounded px-2 py-1 text-[10px]">
          <span>
            Editing {multi.size} breakpoint{multi.size === 1 ? "" : "s"} together
          </span>
          <button
            type="button"
            onClick={clearMulti}
            className="hover:underline"
          >
            clear
          </button>
        </div>
      )}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${CHIP_BP_ORDER.length}, minmax(28px, 1fr))` }}
      >
        {/* Header row */}
        {CHIP_BP_ORDER.map(bp => (
          <div
            key={`h-${bp}`}
            className="text-neutral-content text-center font-mono text-[9px] leading-none"
          >
            {CHIP_BP_LETTER[bp as ChipBp]}
          </div>
        ))}
        {/* Value row */}
        {cells.map(({ bp, value, explicit }) => {
          const isActive = activeBp === bp;
          const isMultiBp = bp !== "mobile" && multi.has(bp as BpKey);
          const shouldPulse = pulseTick > 0 && popover.pulseBp === bp;
          const ringClass = isActive
            ? "ring-1 ring-primary"
            : isMultiBp
              ? "ring-1 ring-primary/60"
              : "";
          const valueClass = explicit
            ? "text-base-content"
            : "text-neutral-content/40";
          return (
            <button
              key={`v-${bp}`}
              type="button"
              onClick={e => onCellClick(bp as ChipBp, e)}
              className={`bg-base-200 hover:bg-base-300 flex h-9 w-full flex-col items-center justify-center rounded transition-colors ${ringClass} ${
                shouldPulse ? "ring-2 ring-amber-400 animate-pulse" : ""
              }`}
              data-tooltip-content={
                explicit
                  ? `${CHIP_BP_LABEL[bp as ChipBp]}: ${String(value)}`
                  : `${CHIP_BP_LABEL[bp as ChipBp]}: —`
              }
              aria-label={`${CHIP_BP_LABEL[bp as ChipBp]} value`}
            >
              <span className={`max-w-full truncate px-1 text-[10px] ${valueClass}`}>
                {explicit ? String(value).replace(/^[a-z]+-/, "") : "—"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="text-neutral-content mt-2 px-1 text-[9px] leading-snug">
        Click a cell → switch canvas view. Alt-click → toggle multi-scope writes.
      </div>
    </AnchoredPopover>
  );
}
