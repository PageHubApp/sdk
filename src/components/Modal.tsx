import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TbX } from "react-icons/tb";
import { Container } from "./Container";
import { useFocusTrap } from "../utils/hooks/useAccessibility";
import { phStorage } from "../utils/phStorage";

const defaultTrigger = {
  type: "click",
  delay: 3,
  showOnce: false,
};

const animationVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-up": {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
  },
  "slide-down": {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  none: { initial: {}, animate: {}, exit: {} },
};

const getStorageKey = anchor => `modal-${anchor}`;
const hasSeenModal = key => {
  try {
    return phStorage.get(key) === "1";
  } catch {
    return false;
  }
};
const markModalSeen = key => {
  try {
    phStorage.set(key, "1");
  } catch {}
};

export const Modal = ({ children, ...props }) => {
  const { id } = useNode();
  const { enabled, actions, query } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef(null);
  const focusTrapRef = useFocusTrap(!enabled && isOpen);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-wire unique IDs on first mount — replace placeholder "my-modal" with node ID
  useEffect(() => {
    if (!enabled || !isMounted) return;
    if (props.anchor && props.anchor !== "my-modal") return;

    const uniqueId = `modal-${id}`;
    try {
      const node = query.node(id).get();
      const childIds = node.data.nodes || [];

      const walkAndFix = nid => {
        try {
          const n = query.node(nid).get();
          if (n.data.props?.id === "my-modal") {
            actions.setProp(nid, p => {
              p.id = uniqueId;
            });
          }
          // Fix action.target references (new system)
          if (n.data.props?.action?.target === "my-modal") {
            actions.setProp(nid, p => {
              p.action = { ...p.action, target: uniqueId };
            });
          }
          // Fix legacy click.value references
          if (n.data.props?.click?.value === "my-modal") {
            actions.setProp(nid, p => {
              p.click = { ...p.click, value: uniqueId };
            });
          }
          for (const cid of n.data.nodes || []) walkAndFix(cid);
        } catch {}
      };
      for (const childId of childIds) walkAndFix(childId);

      actions.setProp(id, p => {
        p.anchor = uniqueId;
      });
    } catch (e) {
      console.warn("Modal: failed to auto-wire IDs", e);
    }
  }, [enabled, isMounted]);

  const trigger = { ...defaultTrigger, ...props.trigger };
  const modalId = props.anchor || `modal-${id}`;
  const storageKey = getStorageKey(modalId);
  const isPreview = enabled && props.view === "preview";

  // ── Editor: toggle backdrop visibility (same pattern as Nav mobile menu) ───

  useEffect(() => {
    if (!enabled || !isMounted) return;
    const backdropEl = document.getElementById(modalId);
    if (!backdropEl) return;

    // Always show backdrop in editor so users can see and edit modal content
    backdropEl.classList.remove("hidden");

    if (isPreview) {
      // Overlay mode — positioned absolute within the relative-positioned root
      backdropEl.style.cssText =
        "position:absolute;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;" +
        (props.backdropBlur ? "backdrop-filter:blur(4px);" : "");
    } else {
      // Edit mode — inline layout so users can drag into content areas
      backdropEl.style.cssText =
        "display:flex;align-items:center;justify-content:center;padding:1rem;width:100%;";
    }

    // Force content panel styles so the modal structure is visible
    Array.from(backdropEl.querySelectorAll("[node-id]")).forEach(el => {
      const nid = el.getAttribute("node-id");
      if (!nid) return;
      try {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.dataset.origStyle) {
          htmlEl.dataset.origStyle = htmlEl.style.cssText || "";
        }
        const n = query.node(nid).get();
        const displayName = n.data.custom?.displayName || "";
        if (displayName.includes("Content") || displayName.includes("content")) {
          htmlEl.style.cssText =
            "display:flex;flex-direction:column;gap:0.5rem;width:100%;max-width:32rem;padding:1.5rem;background:var(--background,#fff);border-radius:var(--radius,0.5rem);box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);";
        }
      } catch {}
    });
  }, [isPreview, enabled, isMounted, modalId]);

  // ── Viewer-only effects ──────────────────────────────────────────────

  useEffect(() => {
    if (enabled || trigger.type !== "load") return;
    if (trigger.showOnce && hasSeenModal(storageKey)) return;
    setIsOpen(true);
    if (trigger.showOnce) markModalSeen(storageKey);
  }, [enabled]);

  useEffect(() => {
    if (enabled || trigger.type !== "delay") return;
    if (trigger.showOnce && hasSeenModal(storageKey)) return;
    const timer = setTimeout(
      () => {
        setIsOpen(true);
        if (trigger.showOnce) markModalSeen(storageKey);
      },
      (trigger.delay || 3) * 1000
    );
    return () => clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (enabled) return;
    const el = anchorRef.current;
    if (!el) return;
    const handler = e => {
      const { action } = e.detail;
      if (action === "open") setIsOpen(true);
      else if (action === "close") setIsOpen(false);
      else setIsOpen(prev => !prev);
    };
    el.addEventListener("pagehub:modal", handler);
    return () => el.removeEventListener("pagehub:modal", handler);
  }, [enabled, isMounted]);

  useEffect(() => {
    if (enabled || !isOpen || props.closeOnEscape === false) return;
    const handler = e => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, isOpen, props.closeOnEscape]);

  useEffect(() => {
    if (enabled || !isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [enabled, isOpen]);

  // Sync isOpen state with the backdrop element's display.
  // Handles delay/load triggers and Escape key. The show-hide action system
  // handles click triggers separately via clickControls.
  useEffect(() => {
    if (enabled || !isMounted) return;
    const backdrop = document.getElementById(modalId);
    if (!backdrop) return;
    if (isOpen) {
      backdrop.classList.remove("hidden");
    } else {
      backdrop.classList.add("hidden");
    }
  }, [enabled, isOpen, isMounted, modalId]);

  // ── Editor mode — just a Container ──────────────────────────────────

  if (enabled) {
    const {
      anchor,
      view: _view,
      trigger: _trigger,
      closeOnBackdrop,
      closeOnEscape,
      showCloseButton,
      closeButtonPosition,
      backdropBlur,
      modalAnimation,
      modalWidth,
      modalPosition,
      ...containerProps
    } = props;

    const rootStyle = containerProps.root?.style || "";
    const previewStyle = isPreview ? "position:relative;min-height:400px;" : "";

    return (
      <Container
        canDelete={true}
        {...containerProps}
        root={{ ...containerProps.root, style: previewStyle + rootStyle }}
        type="container"
        anchor={anchor}
      >
        {children}
      </Container>
    );
  }

  // ── Viewer mode — inline children + isOpen sync ─────────────────────
  // Children render inline: trigger button visible, backdrop starts hidden (className).
  // Show-hide actions + the isOpen effect above toggle the backdrop.
  return (
    <>
      <div
        ref={anchorRef}
        id={props.anchor ? `${props.anchor}-anchor` : undefined}
        data-modal="true"
        data-modal-id={props.anchor || undefined}
        style={{ display: "none" }}
      />
      {children}
    </>
  );
};

Modal.craft = {
  displayName: "Modal",
  custom: { overlay: true },
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: () => true,
  },
};
