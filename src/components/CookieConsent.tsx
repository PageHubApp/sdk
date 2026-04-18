import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "./Container";
import { phStorage } from "../utils/phStorage";

const animationVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-up": {
    initial: { opacity: 0, y: 80 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 80 },
  },
  "slide-down": {
    initial: { opacity: 0, y: -80 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -80 },
  },
  none: { initial: {}, animate: {}, exit: {} },
};

const getStorageKey = (consentKey: string) => `consent-${consentKey}`;
const hasConsented = (key: string) => {
  try {
    const val = phStorage.get(key);
    return val === "accepted" || val === "rejected";
  } catch {
    return false;
  }
};
const markConsent = (key: string, value: "accepted" | "rejected") => {
  try {
    phStorage.set(key, value);
  } catch {}
};

export const CookieConsent = ({ children, ...props }) => {
  const { id } = useNode();
  const { enabled, actions, query } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const consentKey = props.consentKey || "cookie-consent";
  const bannerId = props.anchor || `cookie-consent-${id}`;
  const storageKey = getStorageKey(consentKey);
  const animation = props.animation || "slide-up";
  const position = props.position || "bottom";
  const showBackdrop = props.showBackdrop ?? false;
  const blockScroll = props.blockScroll ?? false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Auto-wire unique IDs on first mount ──────────────────────────────
  useEffect(() => {
    if (!enabled || !isMounted) return;
    if (props.anchor && props.anchor !== "cookie-consent") return;

    const uniqueId = `cookie-consent-${id}`;
    try {
      const node = query.node(id).get();
      const childIds = node.data.nodes || [];

      const walkAndFix = (nid: string) => {
        try {
          const n = query.node(nid).get();
          if (n.data.props?.id === "cookie-consent") {
            actions.setProp(nid, p => {
              p.id = uniqueId;
            });
          }
          if (n.data.props?.action?.target === "cookie-consent") {
            actions.setProp(nid, p => {
              p.action = { ...p.action, target: uniqueId };
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
      console.warn("CookieConsent: failed to auto-wire IDs", e);
    }
  }, [enabled, isMounted]);

  // ── Editor: show banner inline so users can edit it ──────────────────
  useEffect(() => {
    if (!enabled || !isMounted) return;
    const bannerEl = document.getElementById(bannerId);
    if (!bannerEl) return;

    bannerEl.classList.remove("hidden");
    // In editor, render inline so users can see and edit content
    bannerEl.style.cssText = "display:flex;width:100%;padding:1rem;";
  }, [enabled, isMounted, bannerId]);

  // ── Viewer: auto-show on load ────────────────────────────────────────
  useEffect(() => {
    if (enabled) return;
    if (hasConsented(storageKey)) return;
    setIsOpen(true);
  }, [enabled]);

  // ── Listen for dismiss events (show-hide action system) ──────────────
  useEffect(() => {
    if (enabled) return;
    const el = anchorRef.current;
    if (!el) return;
    const handler = (e: CustomEvent) => {
      const { action } = e.detail;
      if (action === "close" || action === "toggle") {
        markConsent(storageKey, "accepted");
        setIsOpen(false);
      }
    };
    el.addEventListener("pagehub:modal", handler);
    return () => el.removeEventListener("pagehub:modal", handler);
  }, [enabled, isMounted, storageKey]);

  // ── Sync isOpen with banner element visibility ───────────────────────
  useEffect(() => {
    if (enabled || !isMounted) return;
    const banner = document.getElementById(bannerId);
    if (!banner) return;
    if (isOpen) {
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
  }, [enabled, isOpen, isMounted, bannerId]);

  // ── Escape key ───────────────────────────────────────────────────────
  useEffect(() => {
    if (enabled || !isOpen || props.closeOnEscape === false) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        markConsent(storageKey, "rejected");
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, isOpen, props.closeOnEscape, storageKey]);

  // ── Block scroll (opt-in) ────────────────────────────────────────────
  useEffect(() => {
    if (enabled || !isOpen || !blockScroll) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [enabled, isOpen, blockScroll]);

  // ── Editor mode — render as Container ────────────────────────────────
  if (enabled) {
    const {
      anchor: _anchor,
      consentKey: _ck,
      position: _pos,
      animation: _anim,
      showBackdrop: _sb,
      backdropBlur: _bb,
      blockScroll: _bs,
      showCloseButton: _scb,
      closeOnEscape: _coe,
      ...containerProps
    } = props;

    return (
      <Container canDelete={true} {...containerProps} type="container" anchor={props.anchor}>
        {children}
      </Container>
    );
  }

  // ── Viewer mode — inline children + isOpen sync ──────────────────────
  return (
    <>
      <div
        ref={anchorRef}
        id={props.anchor ? `${props.anchor}-anchor` : undefined}
        data-modal="true"
        data-modal-id={props.anchor || undefined}
        data-consent-key={consentKey}
        style={{ display: "none" }}
      />
      {children}
    </>
  );
};

CookieConsent.craft = {
  displayName: "CookieConsent",
  custom: { overlay: true },
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: () => true,
  },
};
