import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useAtomState } from "@zedux/react";
import { TbChevronDown, TbChevronUp, TbExternalLink, TbLayoutGrid } from "react-icons/tb";
import { LayersDialogOpenAtom, SidebarLayersPanelAtom } from "../../utils/atoms";
import { phStorage } from "../../utils/phStorage";
import { Layers } from "./dialogs/Layers";

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 250;
const MAX_RATIO = 0.6;

function readHeight(): number {
  const saved = phStorage.get("sidebar-layers-height");
  const n = saved ? parseInt(saved, 10) : NaN;
  return Number.isFinite(n) && n >= MIN_HEIGHT ? n : DEFAULT_HEIGHT;
}

export function SidebarLayersPanel() {
  const [isOpen, setIsOpen] = useAtomState(SidebarLayersPanelAtom);
  const [, setDialogOpen] = useAtomState(LayersDialogOpenAtom);
  const [height, setHeight] = useState(readHeight);
  const panelRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(height);
  heightRef.current = height;

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      phStorage.set("sidebar-layers-panel", String(next));
      return next;
    });
  }, [setIsOpen]);

  // Sync CSS var so the EditorNavigation flyout stops above us
  useLayoutEffect(() => {
    const toolbar = document.getElementById("toolbar");
    if (!toolbar || !panelRef.current) return;
    const sync = () => {
      const h = Math.ceil(panelRef.current!.getBoundingClientRect().height);
      toolbar.style.setProperty("--sidebar-layers-height", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(panelRef.current);
    return () => {
      ro.disconnect();
      toolbar.style.removeProperty("--sidebar-layers-height");
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
      phStorage.set("sidebar-layers-height", String(heightRef.current));
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, []);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="border-base-300 text-sidebar-foreground/70 hover:text-sidebar-foreground flex w-full shrink-0 items-center gap-1.5 border-t px-3 py-2.5 text-[11px] leading-none font-semibold tracking-wide uppercase transition-colors"
      >
        <TbLayoutGrid className="size-3 shrink-0 opacity-70" />
        <span>Layers</span>
        <TbChevronUp className="ml-auto size-3" />
      </button>
    );
  }

  return (
    <div ref={panelRef} className="relative z-[51] flex shrink-0 flex-col" style={{ height }}>
      {/* Resize handle */}
      <div
        onPointerDown={onPointerDown}
        className="border-base-300 hover:bg-primary/20 group flex h-1.5 w-full shrink-0 cursor-ns-resize items-center justify-center border-t transition-colors"
        aria-label="Resize layers panel"
      >
        <div className="bg-base-content/20 group-hover:bg-primary/50 h-0.5 w-8 rounded-full transition-colors" />
      </div>

      {/* Header */}
      <div className="text-sidebar-foreground/70 flex shrink-0 items-center gap-1.5 px-3 pt-1 pb-2">
        <TbLayoutGrid className="size-3 shrink-0 opacity-70" />
        <span className="text-[11px] font-semibold tracking-wide uppercase">Layers</span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="hover:bg-base-200 hover:text-base-content rounded p-0.5 transition-colors"
            aria-label="Pop out layers"
          >
            <TbExternalLink className="size-3" />
          </button>
          <button
            type="button"
            onClick={toggle}
            className="hover:bg-base-200 hover:text-base-content rounded p-0.5 transition-colors"
            aria-label="Collapse layers panel"
          >
            <TbChevronDown className="size-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-base-100 text-base-content flex-1 overflow-hidden">
        <Layers expandRootOnLoad={true} />
      </div>
    </div>
  );
}
