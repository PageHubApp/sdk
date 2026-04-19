import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Auto-hiding horizontal scrollbar thumb. Parent must be the overflow-x scroll container;
 * render this as the first child inside that container, then the rest of the content.
 * Native scrollbar should be hidden on the parent (scrollbarWidth / webkit).
 */
export function HorizontalOverflowThumbOverlay({
  scrollEl,
  hideDelay = 1000,
}: {
  scrollEl: HTMLElement | null;
  hideDelay?: number;
}) {
  const [thumb, setThumb] = useState({ size: 0, position: 0 });
  const [viewportSize, setViewportSize] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragStart = useRef({ pos: 0, scrollPos: 0 });

  const updateThumb = useCallback(() => {
    const el = scrollEl;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    setViewportSize(clientWidth);
    if (scrollWidth <= clientWidth) {
      setThumb({ size: 0, position: 0 });
      return;
    }
    const ratio = clientWidth / scrollWidth;
    const size = Math.max(ratio * clientWidth, 20);
    const maxPos = clientWidth - size;
    const position = (scrollLeft / (scrollWidth - clientWidth)) * maxPos;
    setThumb({ size, position });
  }, [scrollEl]);

  const show = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setDragging(d => {
        if (!d) setVisible(false);
        return d;
      });
    }, hideDelay);
  }, [hideDelay]);

  const handleScroll = useCallback(() => {
    updateThumb();
    show();
  }, [updateThumb, show]);

  const handlePointerEnter = useCallback(() => {
    updateThumb();
    show();
  }, [updateThumb, show]);

  const handlePointerLeave = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setDragging(d => {
      if (!d) hideTimer.current = setTimeout(() => setVisible(false), 300);
      return d;
    });
  }, []);

  const handleThumbPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      dragStart.current = {
        pos: e.clientX,
        scrollPos: scrollEl?.scrollLeft || 0,
      };
    },
    [scrollEl]
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => {
      const el = scrollEl;
      if (!el) return;
      const { scrollWidth, clientWidth } = el;
      const thumbRange = clientWidth - thumb.size;
      if (thumbRange <= 0) return;
      const delta = e.clientX - dragStart.current.pos;
      el.scrollLeft =
        dragStart.current.scrollPos + (delta / thumbRange) * (scrollWidth - clientWidth);
    };
    const handleUp = () => setDragging(false);
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging, thumb.size, scrollEl]);

  useEffect(() => {
    if (!dragging && visible) show();
  }, [dragging, visible, show]);

  useEffect(() => {
    updateThumb();
    const el = scrollEl;
    if (!el) return;
    const ro = new ResizeObserver(updateThumb);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateThumb, scrollEl]);

  useEffect(() => {
    const el = scrollEl;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("pointerenter", handlePointerEnter);
    el.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("pointerenter", handlePointerEnter);
      el.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [scrollEl, handleScroll, handlePointerEnter, handlePointerLeave]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const hasThumb = thumb.size > 0;

  if (!scrollEl || !hasThumb) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        width: viewportSize,
        height: 0,
        overflow: "visible",
        zIndex: 30,
        flexShrink: 0,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: viewportSize,
          height: 6,
          pointerEvents: "none",
        }}
      >
        <div
          role="presentation"
          onPointerDown={handleThumbPointerDown}
          style={{
            position: "absolute",
            bottom: 1,
            left: thumb.position,
            height: 4,
            width: thumb.size,
            borderRadius: 2,
            backgroundColor: "var(--neutral-content, #6b7280)",
            opacity: visible ? 0.5 : 0,
            transition: "opacity 150ms ease",
            cursor: "pointer",
            pointerEvents: visible ? "auto" : "none",
          }}
        />
      </div>
    </div>
  );
}
