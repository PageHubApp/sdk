import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useAtomState } from "@zedux/react";
import { AutoHideScrollbar } from "@/chrome/primitives/layout/AutoHideScrollbar";
import {
  TbChevronDown,
  TbChevronUp,
  TbPinned,
  TbPinnedOff,
} from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { InspectorPinDockOpenAtom } from "../../../../utils/atoms";
import { phStorage } from "../../../../utils/phStorage";
import { getSectionDef } from "../registry/propertyRegistry";
import type { SectionId } from "../registry/propertyDefs";
import { useInspectorPin } from "./InspectorPinContext";

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 250;
const MAX_RATIO = 0.6;

function readHeight(): number {
  const saved = phStorage.get("sidebar-inspector-pin-height");
  const n = saved ? parseInt(saved, 10) : NaN;
  return Number.isFinite(n) && n >= MIN_HEIGHT ? n : DEFAULT_HEIGHT;
}

/**
 * Fixed region below #toolbarContents: hosts portaled PropertySection bodies when pinned.
 * Collapsible + height-adjustable (same interaction model as SidebarLayersPanel).
 */
export function InspectorPinDock() {
  const { pinnedIds, togglePin, registerSlot } = useInspectorPin();
  const [isOpen, setIsOpen] = useAtomState(InspectorPinDockOpenAtom);
  const [height, setHeight] = useState(readHeight);
  const panelRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(height);
  heightRef.current = height;

  /** Stable ref callbacks — inline `ref={el => ...}` changes identity every render and retriggers ref churn + infinite setState. */
  const slotRefById = useRef(
    new Map<string, React.RefCallback<HTMLDivElement>>()
  );

  const refForSlot = (sectionId: SectionId) => {
    const k = String(sectionId);
    let fn = slotRefById.current.get(k);
    if (!fn) {
      fn = (el: HTMLDivElement | null) => {
        registerSlot(sectionId, el);
      };
      slotRefById.current.set(k, fn);
    }
    return fn;
  };

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      phStorage.set("sidebar-inspector-pin-dock", String(next));
      return next;
    });
  }, [setIsOpen]);

  useLayoutEffect(() => {
    const toolbar = document.getElementById("toolbar");
    const el = panelRef.current;
    if (!toolbar || !el) return;

    const sync = () => {
      const node = panelRef.current;
      const tb = document.getElementById("toolbar");
      if (!tb) return;
      if (!node) {
        tb.style.removeProperty("--sidebar-inspector-pin-height");
        return;
      }
      const h = Math.ceil(node.getBoundingClientRect().height);
      tb.style.setProperty("--sidebar-inspector-pin-height", `${h}px`);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      toolbar.style.removeProperty("--sidebar-inspector-pin-height");
    };
  }, [isOpen]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = heightRef.current;

    const onMove = (ev: PointerEvent) => {
      const toolbar = document.getElementById("toolbar");
      const maxH = toolbar ? Math.floor(toolbar.getBoundingClientRect().height * MAX_RATIO) : 600;
      const next = Math.max(MIN_HEIGHT, Math.min(maxH, startH + (startY - ev.clientY)));
      setHeight(next);
      heightRef.current = next;
    };

    const onUp = () => {
      phStorage.set("sidebar-inspector-pin-height", String(heightRef.current));
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, []);

  if (pinnedIds.length === 0) return null;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="border-base-300 text-sidebar-foreground/70 hover:text-sidebar-foreground flex w-full shrink-0 items-center gap-1.5 border-t px-3 py-2.5 text-[11px] leading-none font-semibold tracking-wide uppercase transition-colors"
      >
        <TbPinned className="size-3 shrink-0 opacity-70" />
        <span>Pinned</span>
        <TbChevronUp className="ml-auto size-3" />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="relative z-[51] flex min-h-0 shrink-0 flex-col"
      style={{ height }}
      aria-label="Pinned inspector sections"
    >
      <div
        onPointerDown={onPointerDown}
        className="border-base-300 hover:bg-primary/20 group flex h-1.5 w-full shrink-0 cursor-ns-resize items-center justify-center border-t transition-colors"
        aria-label="Resize pinned panel"
      >
        <div className="bg-base-content/20 group-hover:bg-primary/50 h-0.5 w-8 rounded-full transition-colors" />
      </div>

      <div className="text-sidebar-foreground/70 flex shrink-0 items-center gap-1.5 border-b border-base-300 px-3 pt-1 pb-2">
        <TbPinned className="size-3 shrink-0 opacity-70" />
        <span className="text-[11px] font-semibold tracking-wide uppercase">Pinned</span>
        <button
          type="button"
          onClick={toggle}
          className="hover:bg-base-200 hover:text-base-content ml-auto rounded p-0.5 transition-colors"
          aria-label="Collapse pinned panel"
        >
          <TbChevronDown className="size-3" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {pinnedIds.map(sectionId => {
          const def = getSectionDef(sectionId);
          const title = def?.title ?? String(sectionId);
          return (
            <div
              key={sectionId}
              className="border-base-300/80 flex min-h-0 min-w-0 flex-1 flex-col border-b basis-0 last:border-b-0"
            >
              <div className="bg-sidebar flex shrink-0 items-center justify-between gap-2 border-b border-base-300 px-3 py-1.5">
                <div className="text-sidebar-foreground/85 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
                  {def?.icon && (
                    <span className="text-neutral-content opacity-70">{def.icon}</span>
                  )}
                  <span className="truncate">{title}</span>
                </div>
                <button
                  type="button"
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground inline-flex shrink-0 cursor-pointer items-center gap-1 rounded p-0.5 transition-colors"
                  onClick={() => togglePin(sectionId)}
                  aria-label={`Unpin ${title}`}
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="Unpin from sidebar"
                  data-tooltip-place="top"
                  data-tooltip-offset={6}
                >
                  <TbPinnedOff className="size-3" />
                </button>
              </div>
              <AutoHideScrollbar
                className="min-h-0 flex-1 flex-col overflow-x-hidden"
                hideDelay={2000}
              >
                <div
                  ref={refForSlot(sectionId)}
                  className="bg-base-200 text-base-content grid items-end gap-3 p-3 pt-2"
                  style={{ gridTemplateColumns: "repeat(1, 1fr)" }}
                />
              </AutoHideScrollbar>
            </div>
          );
        })}
      </div>
    </div>
  );
}
