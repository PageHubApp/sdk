/**
 * ChipContextMenu — right-click menu on a BreakpointChip + the kebab menu
 * inside the popover. Same hook + same component for both entry points.
 *
 * Commands:
 *  - Reset at <active bp>
 *  - Reset all breakpoints
 *  - Promote to base
 *  - Copy down
 *  - Copy up
 *  - Show source (opens popover and pulses the source-bp cell)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../../utils/atoms";
import {
  TbArrowsMove,
  TbCornerDownLeft,
  TbCornerUpLeft,
  TbEye,
  TbRefresh,
  TbTrash,
} from "react-icons/tb";

import { ViewAtom } from "../../viewport/atoms";
import { ChipPopoverAtom, CHIP_BP_LABEL, canvasViewToChipBp, type ChipBp } from "./atoms";
import {
  cmdCopyDown,
  cmdCopyUp,
  cmdPromoteToBase,
  cmdResetAll,
  cmdResetAt,
  hasAnyOverride,
  hasValueAtActive,
  sourceBp,
  type CommandCtx,
} from "./commands";

const MENU_Z = 100060;
const ITEM =
  "flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-accent-content focus-visible:bg-accent focus-visible:text-accent-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-current";

interface MenuArgs {
  nodeId: string;
  propKey: string;
  propType?: string;
  index?: any;
  propItemKey?: string | null;
}

type Anchor = { x: number; y: number } | null;

/**
 * Convenience hook: owns the (x,y) state, exposes an opener + the rendered
 * menu element. Mount the returned `menu` inside the chip's render tree.
 */
export function useChipContextMenu(args: MenuArgs) {
  const [anchor, setAnchor] = useState<Anchor>(null);
  const open = useCallback((x: number, y: number) => setAnchor({ x, y }), []);
  const close = useCallback(() => setAnchor(null), []);

  const menu = <ChipContextMenu args={args} anchor={anchor} onClose={close} />;

  return { open, close, menu, isOpen: !!anchor };
}

/**
 * Standalone menu component. Mount once per chip; visibility driven by
 * `anchor`. Wraps the menu in a portal + Escape/click-outside handlers.
 */
export function ChipContextMenu({
  args,
  anchor,
  onClose,
}: {
  args: MenuArgs;
  anchor: Anchor;
  onClose: () => void;
}) {
  const { actions, query } = useEditor();
  const view = useAtomValue(ViewAtom);
  const setPopover = useSetAtomState(ChipPopoverAtom);
  const rootRef = useRef<HTMLDivElement>(null);

  const open = !!anchor;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer, true);
    };
  }, [open, onClose]);

  if (!open || !anchor) return null;

  const node = query.node(args.nodeId).get();
  if (!node) return null;
  const nodeProps = node?.data?.props ?? {};
  // changeProp expects a useNode-style setProp(cb, throttle). Adapt the editor
  // actions.setProp(nodeId, cb) signature so the existing helper can drive it.
  const setProp = (cb: any, _throttle?: number) => actions.setProp(args.nodeId, cb);

  const activeBp: ChipBp = canvasViewToChipBp(view) ?? "mobile";

  const ctx: CommandCtx = {
    nodeId: args.nodeId,
    propKey: args.propKey,
    propType: args.propType ?? "class",
    index: args.index ?? null,
    propItemKey: args.propItemKey ?? null,
    setProp,
    query,
    actions,
    nodeProps,
    activeBp,
  };

  const canResetAtActive = hasValueAtActive(ctx);
  const canResetAll = hasAnyOverride(ctx);
  const canPromote = hasValueAtActive(ctx) && hasAnyOverride(ctx);
  const canCopyDown = hasValueAtActive(ctx);
  const canCopyUp = hasValueAtActive(ctx);
  const sBp = sourceBp(ctx);

  const handle = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const showSource = () => {
    if (!sBp) return;
    setPopover({
      nodeId: args.nodeId,
      propKey: args.propKey,
      propType: args.propType ?? "class",
      index: args.index ?? null,
      propItemKey: args.propItemKey ?? null,
      pulseBp: sBp,
    });
    onClose();
  };

  const pad = 8;
  const estW = 220;
  const estH = 240;
  const left = Math.max(pad, Math.min(anchor.x, window.innerWidth - estW - pad));
  const top = Math.max(pad, Math.min(anchor.y, window.innerHeight - estH - pad));

  return createPortal(
    <div
      ref={rootRef}
      className="pagehub-sdk-root border-base-300/50 bg-base-100 text-base-content fixed min-w-[12rem] overflow-visible rounded-xl border py-1 shadow-xl select-none"
      style={{ left, top, zIndex: MENU_Z }}
      role="menu"
      aria-label="Breakpoint property actions"
    >
      <button
        type="button"
        role="menuitem"
        className={ITEM}
        disabled={!canResetAtActive}
        onClick={handle(() => cmdResetAt(ctx, activeBp))}
      >
        <TbTrash className="size-3.5 shrink-0 opacity-80" aria-hidden />
        Reset at {CHIP_BP_LABEL[activeBp]}
      </button>
      <button
        type="button"
        role="menuitem"
        className={ITEM}
        disabled={!canResetAll}
        onClick={handle(() => cmdResetAll(ctx))}
      >
        <TbRefresh className="size-3.5 shrink-0 opacity-80" aria-hidden />
        Reset all breakpoints
      </button>
      <div className="border-base-300 my-1 border-t" aria-hidden />
      <button
        type="button"
        role="menuitem"
        className={ITEM}
        disabled={!canPromote}
        onClick={handle(() => cmdPromoteToBase(ctx))}
      >
        <TbArrowsMove className="size-3.5 shrink-0 opacity-80" aria-hidden />
        Promote to base
      </button>
      <button
        type="button"
        role="menuitem"
        className={ITEM}
        disabled={!canCopyDown}
        onClick={handle(() => cmdCopyDown(ctx))}
      >
        <TbCornerDownLeft className="size-3.5 shrink-0 opacity-80" aria-hidden />
        Copy down (smaller bps)
      </button>
      <button
        type="button"
        role="menuitem"
        className={ITEM}
        disabled={!canCopyUp}
        onClick={handle(() => cmdCopyUp(ctx))}
      >
        <TbCornerUpLeft className="size-3.5 shrink-0 opacity-80" aria-hidden />
        Copy up (larger bps)
      </button>
      <div className="border-base-300 my-1 border-t" aria-hidden />
      <button type="button" role="menuitem" className={ITEM} disabled={!sBp} onClick={showSource}>
        <TbEye className="size-3.5 shrink-0 opacity-80" aria-hidden />
        Show source ({sBp ? CHIP_BP_LABEL[sBp] : "—"})
      </button>
    </div>,
    document.body
  );
}
