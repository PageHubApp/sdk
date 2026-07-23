/**
 * `<Modal>` — the centered / drawer modal primitive (NOT draggable; that's
 * `FloatingPanel`'s job). Shares the same low-level behavior hooks so we don't
 * fork: portal into `.pagehub-sdk-root`, themed `ph-modal-backdrop` +
 * `ph-modal-surface`, focus-trap, and centralized Escape via the overlay stack.
 *
 * Rendered by `<ModalHost>` for every registered modal whose def has
 * `chrome !== false`. Also usable directly by hosts that want the shell.
 */
import React from "react";
import { createPortal } from "react-dom";
import { TbX } from "react-icons/tb";
import { twMerge } from "tailwind-merge";
import { useFocusTrap } from "../../utils/hooks/useAccessibility";
import { useOverlay } from "../../registry/hooks/useOverlay";
import { getPortalTarget } from "../popovers/getPortalTarget";
import { OVERLAY_Z_MODAL } from "../popovers/overlayZIndex";
import type { ModalSize, ModalVariant } from "../../registry/types";

export interface ModalProps {
  /** Overlay-stack id (Escape / LIFO dismiss). */
  id: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize; // default "md"
  variant?: ModalVariant; // default "centered"
  /** Backdrop click + Escape dismiss. Default true. */
  dismissable?: boolean;
  zIndex?: number;
  /** Merged onto the modal card. */
  className?: string;
  children: React.ReactNode;
}

const SIZE_WIDTH: Record<ModalSize, string> = {
  sm: "w-full max-w-sm",
  md: "w-full max-w-lg",
  lg: "w-full max-w-2xl",
  xl: "w-full max-w-4xl",
  full: "w-full max-w-none",
};

export function Modal({
  id,
  isOpen,
  onClose,
  title,
  size = "md",
  variant = "centered",
  dismissable = true,
  zIndex = OVERLAY_Z_MODAL,
  className,
  children,
}: ModalProps): React.JSX.Element | null {
  const focusTrapRef = useFocusTrap(isOpen);
  // Centralized Escape via the overlay stack — only while dismissable.
  useOverlay({ id, isOpen: isOpen && dismissable, onDismiss: onClose });

  if (!isOpen || typeof document === "undefined") return null;

  const isDrawer = variant === "drawer-right" || variant === "drawer-left";
  const positioner =
    variant === "drawer-right"
      ? "items-stretch justify-end"
      : variant === "drawer-left"
        ? "items-stretch justify-start"
        : "items-center justify-center";
  const cardShape = isDrawer
    ? "h-full max-h-none rounded-none"
    : size === "full"
      ? "h-full max-h-none rounded-none"
      : "max-h-[90vh] rounded-box";

  return createPortal(
    <>
      <div
        className="pagehub-sdk-root ph-modal-backdrop fixed inset-0"
        style={{ zIndex: zIndex - 1 }}
        onClick={dismissable ? onClose : undefined}
        aria-hidden="true"
      />
      {/* Positioner ignores pointer events so clicks outside the card fall
          through to the backdrop; the card re-enables them. */}
      <div
        className={twMerge("pagehub-sdk-root pointer-events-none fixed inset-0 flex p-4", positioner)}
        style={{ zIndex }}
      >
        <div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={twMerge(
            "ph-modal-surface text-base-content pointer-events-auto flex flex-col overflow-hidden",
            SIZE_WIDTH[size],
            cardShape,
            className
          )}
        >
          {title !== undefined && (
            <div className="border-base-300 flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">{title}</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="hover:bg-base-200 rounded p-1 transition-colors"
              >
                <TbX className="size-4" />
              </button>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </>,
    getPortalTarget()
  );
}
