import React, { useEffect, useRef, useState, useCallback } from "react";

interface AutoHideScrollbarProps {
  children: React.ReactNode;
  className?: string;
  hideDelay?: number;
  id?: string;
}

export function AutoHideScrollbar({
  children,
  className = "",
  hideDelay = 1000,
  id,
}: AutoHideScrollbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ height: 0, top: 0 });
  const [viewportH, setViewportH] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragStart = useRef({ y: 0, scrollTop: 0 });

  const updateThumb = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    setViewportH(clientHeight);
    if (scrollHeight <= clientHeight) {
      setThumb({ height: 0, top: 0 });
      return;
    }
    const ratio = clientHeight / scrollHeight;
    const h = Math.max(ratio * clientHeight, 20);
    const maxTop = clientHeight - h;
    const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;
    setThumb({ height: h, top });
  }, []);

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

  const handleMouseEnter = useCallback(() => {
    updateThumb();
    show();
  }, [updateThumb, show]);

  const handleMouseLeave = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setDragging(d => {
      if (!d) hideTimer.current = setTimeout(() => setVisible(false), 300);
      return d;
    });
  }, []);

  // Thumb drag
  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    dragStart.current = {
      y: e.clientY,
      scrollTop: containerRef.current?.scrollTop || 0,
    };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const { scrollHeight, clientHeight } = el;
      const thumbRange = clientHeight - thumb.height;
      if (thumbRange <= 0) return;
      const deltaY = e.clientY - dragStart.current.y;
      el.scrollTop =
        dragStart.current.scrollTop + (deltaY / thumbRange) * (scrollHeight - clientHeight);
    };
    const handleUp = () => setDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, thumb.height]);

  // Restart hide timer when drag ends
  useEffect(() => {
    if (!dragging && visible) show();
  }, [dragging]);

  // Observe container size changes
  useEffect(() => {
    updateThumb();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateThumb);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateThumb]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const hasThumb = thumb.height > 0;

  return (
    <div
      ref={containerRef}
      id={id}
      data-custom-scroll
      role="presentation"
      className={`${className}`}
      style={{ overflowY: "auto", overflowX: "hidden" }}
      onScroll={handleScroll}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Sticky scrollbar track — full-width, zero-height wrapper so the inner `right: 0` aligns
          to the scroll viewport's right edge. `float: right` is ignored when `position: sticky` is
          set (per CSS spec), so we use width:100% + absolute children instead. */}
      {hasThumb && (
        <div
          aria-hidden="true"
          style={{
            position: "sticky",
            top: 0,
            height: 0,
            width: "100%",
            overflow: "visible",
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 6,
              height: viewportH,
              pointerEvents: "none",
            }}
          >
            <div
              ref={thumbRef}
              role="presentation"
              aria-hidden="true"
              onMouseDown={handleThumbMouseDown}
              style={{
                position: "absolute",
                right: 1,
                top: thumb.top,
                width: 4,
                height: thumb.height,
                borderRadius: 2,
                backgroundColor: "var(--neutral-content)",
                opacity: visible ? 0.5 : 0,
                transition: "opacity 150ms ease",
                cursor: "pointer",
                pointerEvents: visible ? "auto" : "none",
              }}
            />
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
