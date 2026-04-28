import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { TbX } from "react-icons/tb";
import { twMerge } from "tailwind-merge";
import { useDraggableWindow } from "../hooks/useDraggableWindow";
import { useResizable } from "../hooks/useResizable";
import { useFocusTrap } from "../../utils/hooks/useAccessibility";
import { AutoHideScrollbar } from "../primitives/layout/AutoHideScrollbar";

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/**
 * Descendant-portal registration for FloatingPanel's outside-click dismiss.
 *
 * Any portaled overlay opened from inside a FloatingPanel (AnchoredPopover,
 * nested FloatingPanel, hand-rolled portal) registers its root element here so
 * pointerdowns inside it don't dismiss the parent. Replaces the old hardcoded
 * selector skip-list — a portal that doesn't self-register is "outside" and
 * will dismiss its parent panel. Use `useFloatingPanelPortalRegister()` from
 * inside any portal that mounts under a FloatingPanel.
 */
const FloatingPanelContext = React.createContext<{
  registerPortal: (node: HTMLElement | null) => () => void;
} | null>(null);

/**
 * Returns a register function that, given a portal root element, marks it as
 * "inside" the nearest ancestor FloatingPanel for dismiss-checking purposes.
 * Returns the unsubscribe function. No-ops outside a FloatingPanel.
 */
export function useFloatingPanelPortalRegister():
  | ((node: HTMLElement | null) => () => void)
  | null {
  const ctx = useContext(FloatingPanelContext);
  return ctx?.registerPortal ?? null;
}

/**
 * Hook form: pass a ref pointing at a portal root and it auto-registers /
 * unregisters with the nearest ancestor FloatingPanel. Use in inline portals
 * where wiring a manual useEffect feels heavy.
 */
export function useRegisterFloatingPanelPortal(
  ref: React.RefObject<HTMLElement | null>
): void {
  const register = useFloatingPanelPortalRegister();
  useEffect(() => {
    const node = ref.current;
    if (!node || !register) return;
    return register(node);
    // ref is stable; only the register identity matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register]);
}

interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  /** Show a backdrop overlay behind the panel */
  backdrop?: boolean;
  /** When false, backdrop does not close the panel on click (backdrop still blocks pointer events). Default true. */
  backdropCloseOnClick?: boolean;
  /** Extra classes for the backdrop (e.g. `ph-modal-backdrop--light`). */
  backdropClassName?: string;
  /** useResizable options */
  storageKey: string;
  /**
   * When `autoSize` is false (default): required — fixed pixel size, panel
   * is resizable, dims persist to storage.
   *
   * When `autoSize` is true: optional — if omitted, the panel hugs its
   * content (`w-fit`/`h-fit`); if set, used as a starting size hint via
   * CSS `width`/`height` but content/min/max still drive layout.
   */
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  edges?: ResizeEdge[];
  /** Persist resized size to storage. Default true. Pass false for ephemeral popovers. */
  persistSize?: boolean;
  /**
   * **Default true.** Width / height collapse to `fit-content` clamped by
   * `minWidth` / `maxWidth` / `minHeight` / `maxHeight`. Resize handles and
   * persisted size are disabled. Right for the vast majority of toolbar /
   * sidebar popovers — small forms whose content drives layout (Calc,
   * Condition / Action / Effect-row editors, DataAttributes, Bundle, etc.).
   *
   * Pass `autoSize={false}` to opt into a fixed pixel box with user-resize
   * + persisted dims. Use for: large dialogs (Page / Site / Modifiers
   * settings, Layers, Modifiers picker), grid pickers whose column count
   * depends on width (Icon, Pattern), the SketchPicker color panel, the
   * inline tiptap editor in Text main-tab, and any panel where the user
   * benefits from dragging the size manually.
   *
   * When `autoSize` is false, `defaultWidth` and `defaultHeight` are
   * REQUIRED. When true, both are optional and used only as a hint for
   * initial position math (centering, dock-to-edge).
   */
  autoSize?: boolean;
  /** Initial position — defaults to centered */
  initialPosition?: { x: number; y: number };
  /**
   * Snap the panel to a screen edge when opened or when this value changes.
   * Uses current panel width (e.g. after persisted resize). Omit to keep free placement / `initialPosition` only.
   */
  dockToEdge?: "left" | "right";
  /** Header close button side. Default: right. */
  closeButtonSide?: "left" | "right";
  /** z-index for the panel (default 999) */
  zIndex?: number;
  /**
   * Wrap children in an `AutoHideScrollbar` + padded body div automatically.
   * Default `true` — matches what 7+ popover panels were hand-rolling. Set
   * `false` for panels whose content manages its own scroll (e.g. icon
   * pickers with their own grid scroll, layered tabbed surfaces).
   */
  scrollable?: boolean;
  /**
   * Inner body wrapper className when `scrollable` is true. Default matches
   * the popover-panel convention. Pass a custom string to override; pass
   * `null` to skip the inner wrapper entirely (rare — when scrollable
   * is true but you want children flush against AutoHideScrollbar).
   */
  bodyClassName?: string | null;
  /**
   * DOM nodes (typically anchors / triggers / sibling widget chrome) where
   * clicks should NOT dismiss the panel even though they're outside the
   * panel's own DOM. Use when the panel logically belongs to a wider widget
   * — e.g. VarPicker anchored to a chip but conceptually owned by the whole
   * UniversalInput row, so clicking the row's text input shouldn't dismiss.
   */
  ignoreOutsideClicks?: ReadonlyArray<React.RefObject<HTMLElement | null>>;
  children: React.ReactNode;
}

export function FloatingPanel({
  isOpen,
  onClose,
  title,
  icon,
  backdrop = false,
  backdropCloseOnClick = true,
  backdropClassName,
  storageKey,
  defaultWidth,
  defaultHeight,
  minWidth = 300,
  maxWidth = 1200,
  minHeight = 300,
  maxHeight = Math.round(typeof window !== "undefined" ? window.innerHeight * 0.95 : 800),
  edges = ["e", "s", "se"],
  initialPosition,
  dockToEdge,
  closeButtonSide = "right",
  zIndex = 999,
  persistSize = true,
  scrollable = false,
  bodyClassName = "text-base-content flex flex-col gap-2 p-3 text-xs",
  ignoreOutsideClicks,
  autoSize = true,
  children,
}: FloatingPanelProps) {
  if (process.env.NODE_ENV !== "production" && !autoSize) {
    if (defaultWidth == null || defaultHeight == null) {
      console.error(
        "[FloatingPanel] defaultWidth/defaultHeight are required when autoSize is false"
      );
    }
  }
  // Fallback hint values used by initialPosition math (centering / dock) and
  // the resizable hook when autoSize panels still pass a starting hint.
  const widthHint = defaultWidth ?? 320;
  const heightHint = defaultHeight ?? 360;
  const [viewport, setViewport] = React.useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const viewportInset = 12;
  const boundedMaxWidth = Math.max(180, Math.min(maxWidth, viewport.width - viewportInset * 2));
  const boundedMaxHeight = Math.max(180, Math.min(maxHeight, viewport.height - viewportInset * 2));

  const defaultPos = (() => {
    if (initialPosition) return initialPosition;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    if (dockToEdge === "right") {
      return { x: Math.max(8, vw - widthHint - 12), y: 40 };
    }
    if (dockToEdge === "left") {
      return { x: 8, y: 40 };
    }
    return {
      x: Math.round(vw / 2 - widthHint / 2),
      y: 40,
    };
  })();

  const focusTrapRef = useFocusTrap(isOpen);

  // Set of descendant portal roots that should NOT count as "outside" for
  // dismiss. Populated via FloatingPanelContext by AnchoredPopover, nested
  // FloatingPanels, and any hand-rolled portal that calls
  // useFloatingPanelPortalRegister().
  const portalsRef = useRef<Set<HTMLElement>>(new Set());
  const registerPortal = useCallback((node: HTMLElement | null) => {
    if (!node) return () => {};
    portalsRef.current.add(node);
    return () => {
      portalsRef.current.delete(node);
    };
  }, []);
  const ctxValue = useMemo(() => ({ registerPortal }), [registerPortal]);

  // If THIS panel is itself mounted inside another FloatingPanel (panel-on-
  // panel — e.g. ColorPanel anchored next to a parent editor panel), register
  // our root with the parent so its outside-click handler skips clicks that
  // land inside us. Without this, opening a nested panel would dismiss the
  // parent on the very next pointerdown.
  const parentRegister = useContext(FloatingPanelContext)?.registerPortal;
  const selfPortalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Register our root with the parent FloatingPanel (if any) so its outside-
  // click handler skips clicks on us. Re-runs when isOpen flips so the parent
  // sees us only while we're actually mounted.
  useEffect(() => {
    if (!isOpen || !parentRegister) return;
    const node = selfPortalRef.current;
    if (!node) return;
    return parentRegister(node);
  }, [isOpen, parentRegister]);

  const { position, isDragging, windowRef, handleMouseDown, setPosition } = useDraggableWindow({
    initialPosition: defaultPos,
    bounds: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  // Outside-click dismiss. Skip clicks inside the panel itself, inside any
  // self-registered descendant portal (AnchoredPopover, nested FloatingPanel,
  // hand-rolled portals using useFloatingPanelPortalRegister), or inside a
  // third-party portal we can't make self-register: Headless UI
  // (`[data-headlessui-portal]`) and react-tooltip (`[data-rtt-tooltip]`).
  // Defer the listener by one frame so the same pointerdown that opened the
  // panel can't close it.
  //
  // CAPTURE PHASE — must fire BEFORE any React element-level handler. Headless
  // UI's Listbox option click runs on pointerdown and synchronously detaches
  // the portaled options panel; if we ran in bubble phase, the orphaned
  // subtree would miss our containment checks and close the parent panel.
  // Capture phase fires while the DOM is still intact.
  useEffect(() => {
    if (!isOpen) return;
    let active = false;
    const arm = requestAnimationFrame(() => {
      active = true;
    });
    const handlePointerDown = (e: PointerEvent) => {
      if (!active) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const panel = (windowRef as any).current as HTMLElement | null;
      if (panel && panel.contains(target)) return;
      for (const portal of portalsRef.current) {
        if (portal.contains(target)) return;
      }
      if (ignoreOutsideClicks) {
        for (const ref of ignoreOutsideClicks) {
          const node = ref?.current;
          if (node && node.contains(target)) return;
        }
      }
      if (target.closest("[data-headlessui-portal], [data-rtt-tooltip]")) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      cancelAnimationFrame(arm);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen, onClose, windowRef, ignoreOutsideClicks]);

  // When autoSize, bypass useResizable entirely — no fixed pixel dims, no
  // resize handles, no persisted size. CSS min/max + content drives layout.
  const resizable = useResizable({
    storageKey,
    defaultWidth: widthHint,
    defaultHeight: heightHint,
    minWidth,
    maxWidth: boundedMaxWidth,
    minHeight,
    maxHeight: boundedMaxHeight,
    edges,
    persist: persistSize && !autoSize,
  });
  const width = autoSize ? undefined : resizable.width;
  const height = autoSize ? undefined : resizable.height;
  const handleProps = autoSize ? ({} as typeof resizable.handleProps) : resizable.handleProps;

  useLayoutEffect(() => {
    if (!isOpen || !dockToEdge) return;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    // Use the live measured width when fixed; fall back to the hint for autoSize.
    const w = width ?? widthHint;
    const x = dockToEdge === "right" ? Math.max(8, vw - w - 12) : 8;
    setPosition({ x, y: 40 });
  }, [isOpen, dockToEdge, setPosition, width, widthHint, viewport.width]);

  useLayoutEffect(() => {
    if (!isOpen || dockToEdge) return;
    // Skip viewport-clamp for autoSize panels — CSS max-width / max-height
    // already cap them and there's no measured width to clamp against.
    if (autoSize) return;
    setPosition(prev => ({
      x: Math.max(0, Math.min(prev.x, Math.max(0, viewport.width - (width ?? 0)))),
      y: Math.max(0, Math.min(prev.y, Math.max(0, viewport.height - (height ?? 0)))),
    }));
  }, [autoSize, dockToEdge, height, isOpen, setPosition, viewport.height, viewport.width, width]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOpen]);

  if (!isOpen) return null;

  const closeButton = (
    <button
      onClick={onClose}
      className="text-accent-content hover:bg-accent-content/10 rounded p-0.5 transition-colors"
    >
      <TbX className="size-3.5" />
    </button>
  );

  const titleNode = (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs font-semibold">{title}</span>
    </div>
  );

  return ReactDOM.createPortal(
    <FloatingPanelContext.Provider value={ctxValue}>
      {backdrop && (
        <div
          className={twMerge("pagehub-sdk-root ph-modal-backdrop", backdropClassName)}
          style={{ zIndex: zIndex - 1 }}
          onClick={backdropCloseOnClick ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      <div
        ref={el => {
          (windowRef as any).current = el;
          (focusTrapRef as any).current = el;
          selfPortalRef.current = el;
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pagehub-sdk-root ph-modal-surface pointer-events-auto fixed overflow-hidden"
        style={
          autoSize
            ? {
                top: position.y,
                left: position.x,
                minWidth,
                maxWidth: boundedMaxWidth,
                minHeight,
                maxHeight: boundedMaxHeight,
                zIndex,
              }
            : { top: position.y, left: position.x, width, height, zIndex }
        }
      >
        {!autoSize &&
          (edges as string[]).map(e =>
            (handleProps as any)[e] ? <div key={e} {...(handleProps as any)[e]} /> : null
          )}

        <div className={autoSize ? "flex max-h-full flex-col" : "flex h-full flex-col"}>
          {/* Header — drag handle */}
          <div
            role="presentation"
            aria-hidden="true"
            onMouseDown={handleMouseDown}
            className={`text-base-content flex items-center justify-between px-3 py-1.5 ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {closeButtonSide === "left" ? (
              <>
                <div className="flex min-w-0 items-center gap-2">
                  {closeButton}
                  {titleNode}
                </div>
                <span className="size-5" aria-hidden="true" />
              </>
            ) : (
              <>
                {titleNode}
                {closeButton}
              </>
            )}
          </div>

          {scrollable ? (
            <AutoHideScrollbar className="flex-1">
              {bodyClassName == null ? children : <div className={bodyClassName}>{children}</div>}
            </AutoHideScrollbar>
          ) : (
            children
          )}
        </div>
      </div>
    </FloatingPanelContext.Provider>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
