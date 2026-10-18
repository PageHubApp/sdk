/**
 * `<Modal>` — the one centered / drawer / bottom-sheet modal shell (NOT draggable; that's
 * `FloatingPanel`'s job). Every dialog in the editor chrome, the dashboard and
 * the marketing site renders through it, so backdrop, motion, Escape, focus
 * trap, scroll lock and `role="dialog"` behave the same everywhere.
 *
 * Rendered by `<ModalHost>` for every registered modal whose def has
 * `chrome !== false`. Also usable directly. See docs/sdk/modal.md.
 *
 * Backdrop rule: Chrome doesn't draw a `backdrop-filter` while the element (or
 * an ancestor) is partway through an opacity fade, so a fading blurred layer
 * shows a sharp page and then snaps to blurred. The tint layer fades opacity
 * and has no blur; the blur layer stays at opacity 1 and animates its radius.
 */
import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { TbX } from "react-icons/tb";
import { twMerge } from "tailwind-merge";
import { useFocusTrap } from "../../utils/hooks/useAccessibility";
import { useScrollLock } from "../../utils/hooks/useScrollLock";
import { useOverlay } from "../../registry/hooks/useOverlay";
import { usePortalTarget } from "../popovers/usePortalTarget";
import { OVERLAY_Z_MODAL } from "../popovers/overlayZIndex";
import type { ModalSize, ModalVariant } from "../../registry/types";
import { MODAL_EASING, useModalPresence } from "./useModalPresence";
import { shouldCloseOnEscape } from "./modalEscape";

export interface ModalProps {
  isOpen: boolean;
  /** Called on Escape, backdrop click and the header close button. */
  onClose?: () => void;
  /** Overlay-stack id (Escape / LIFO dismiss). Generated when omitted. */
  id?: string;
  /** Renders the header bar (with `surface`) and labels the dialog. */
  title?: string;
  /** Accessible name when there's no `title` and no `ariaLabelledBy`. */
  ariaLabel?: string;
  /** Id of the element inside `children` that names the dialog. */
  ariaLabelledBy?: string;
  /** `alertdialog` for interruptions that need an answer. Default `dialog`. */
  role?: "dialog" | "alertdialog";
  size?: ModalSize; // default "md"
  variant?: ModalVariant; // default "centered"
  /** Escape + backdrop dismiss. Default true. */
  dismissable?: boolean;
  /** Backdrop click dismiss. Defaults to `dismissable`. */
  closeOnBackdrop?: boolean;
  /** Stacking level — an `OVERLAY_Z_*` constant. Default `OVERLAY_Z_MODAL`. */
  zIndex?: number;
  /**
   * true (default): the shell draws the card (`ph-modal-surface`, `size`
   * width, `title` header). false: the panel is a bare box and `children`
   * draw their own card.
   */
  surface?: boolean;
  /** Backdrop tint classes. Default `bg-base-100/75`. */
  tintClassName?: string;
  /** Backdrop blur radius in px; 0 for none. Default 8. */
  blur?: number;
  /** Merged onto the panel (the card when `surface`). */
  className?: string;
  /** Merged onto the full-screen flex box that positions the panel. */
  positionerClassName?: string;
  children: React.ReactNode;
}

const SIZE_WIDTH: Record<ModalSize, string> = {
  sm: "w-full max-w-sm",
  md: "w-full max-w-lg",
  lg: "w-full max-w-2xl",
  xl: "w-full max-w-4xl",
  full: "w-full max-w-none",
};

const HIDDEN_TRANSFORM: Record<ModalVariant, string> = {
  centered: "translateY(8px) scale(0.98)",
  "drawer-right": "translateX(24px)",
  "drawer-left": "translateX(-24px)",
  "sheet-bottom": "translateY(100%)",
};

const POSITIONER: Record<ModalVariant, string> = {
  centered: "items-center justify-center",
  "drawer-right": "items-stretch justify-end",
  "drawer-left": "items-stretch justify-start",
  // The gap above the sheet leaves the page peeking out, so it reads as on top
  // of where you were rather than a new page.
  "sheet-bottom": "items-end justify-center px-0 pb-0 pt-4 sm:px-3 sm:pt-12",
};

export function Modal({
  isOpen,
  onClose,
  id,
  title,
  ariaLabel,
  ariaLabelledBy,
  role = "dialog",
  size = "md",
  variant = "centered",
  dismissable = true,
  closeOnBackdrop = dismissable,
  zIndex = OVERLAY_Z_MODAL,
  surface = true,
  tintClassName = "bg-base-100/75",
  blur = 8,
  className,
  positionerClassName,
  children,
}: ModalProps): React.JSX.Element | null {
  const generatedId = useId();
  const overlayId = id ?? `modal:${generatedId}`;
  const { mounted, shown, durationMs } = useModalPresence(isOpen);
  const focusTrapRef = useFocusTrap(isOpen);
  useScrollLock(isOpen);
  const portalTarget = usePortalTarget();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const close = () => onCloseRef.current?.();

  // Editor Escape goes through the overlay stack; everywhere else the window
  // listener below handles it (see shouldCloseOnEscape for why both are safe).
  const escapeEnabled = isOpen && dismissable;
  useOverlay({ id: overlayId, isOpen: escapeEnabled, onDismiss: close });
  useEffect(() => {
    if (!escapeEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldCloseOnEscape(event, overlayId)) return;
      event.preventDefault();
      onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [escapeEnabled, overlayId]);

  if (!mounted || typeof document === "undefined") return null;

  const transition = (props: string) =>
    props
      .split(",")
      .map(p => `${p.trim()} ${durationMs}ms ${MODAL_EASING}`)
      .join(", ");
  const backdropClick = closeOnBackdrop ? close : undefined;

  const isDrawer = variant === "drawer-right" || variant === "drawer-left";
  const isSheet = variant === "sheet-bottom";
  const cardShape = isSheet
    ? "h-full max-h-none w-full max-w-none rounded-t-2xl rounded-b-none"
    : isDrawer || size === "full"
      ? "h-full max-h-none rounded-none"
      : "max-h-[90vh] rounded-box";

  return createPortal(
    <>
      {blur > 0 && (
        <div
          aria-hidden="true"
          className="fixed inset-0"
          style={{
            zIndex: zIndex - 1,
            backdropFilter: `blur(${shown ? blur : 0}px)`,
            WebkitBackdropFilter: `blur(${shown ? blur : 0}px)`,
            transition: transition("backdrop-filter, -webkit-backdrop-filter"),
          }}
          onClick={backdropClick}
        />
      )}
      <div
        aria-hidden="true"
        className={twMerge("fixed inset-0", tintClassName)}
        style={{ zIndex: zIndex - 1, opacity: shown ? 1 : 0, transition: transition("opacity") }}
        onClick={backdropClick}
      />
      {/* Positioner ignores pointer events so clicks outside the panel fall
          through to the backdrop; the panel re-enables them. */}
      <div
        className={twMerge(
          "pointer-events-none fixed inset-0 flex p-4",
          POSITIONER[variant],
          positionerClassName
        )}
        style={{ zIndex }}
      >
        <div
          ref={focusTrapRef}
          role={role}
          aria-modal="true"
          aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? title)}
          aria-labelledby={ariaLabelledBy}
          className={twMerge(
            "pointer-events-auto",
            surface &&
              twMerge(
                "ph-modal-surface text-base-content flex flex-col overflow-hidden",
                SIZE_WIDTH[size],
                cardShape
              ),
            className
          )}
          style={{
            // `ph-modal-surface` carries a keyframe entrance; the transition owns motion here.
            animation: "none",
            // A sheet slides the whole way in; fading it as well looks washed out.
            opacity: shown || isSheet ? 1 : 0,
            transform: shown ? "none" : HIDDEN_TRANSFORM[variant],
            transition: transition("opacity, transform"),
          }}
        >
          {surface && title !== undefined && (
            <div className="border-base-300 flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">{title}</span>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="hover:bg-base-200 rounded p-1 transition-colors"
              >
                <TbX className="size-4" />
              </button>
            </div>
          )}
          {surface ? <div className="min-h-0 flex-1 overflow-auto">{children}</div> : children}
        </div>
      </div>
    </>,
    portalTarget
  );
}
