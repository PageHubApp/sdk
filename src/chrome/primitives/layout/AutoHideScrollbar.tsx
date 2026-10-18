import React, { useCallback, useEffect, useRef, useState } from "react";

interface AutoHideScrollbarProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hideDelay?: number;
  id?: string;
  orientation?: "vertical" | "horizontal";
}

/**
 * A scroller whose thumb shows while you scroll or hover, then fades. Draws
 * its own thumb (the native one is hidden) in the shared scrollbar colour.
 */
export const AutoHideScrollbar: React.FC<AutoHideScrollbarProps> = ({
  children,
  className = "",
  style: styleProp,
  hideDelay = 1000,
  id,
  orientation = "vertical",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ size: 0, position: 0 });
  const [viewportSize, setViewportSize] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const dragStart = useRef({ pos: 0, scrollPos: 0 });

  const isVertical = orientation === "vertical";

  const updateThumb = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isVertical) {
      const { scrollHeight, clientHeight, scrollTop } = el;
      setViewportSize(clientHeight);
      if (scrollHeight <= clientHeight) {
        setThumb({ size: 0, position: 0 });
        return;
      }
      const ratio = clientHeight / scrollHeight;
      const size = Math.max(ratio * clientHeight, 20);
      const maxPos = clientHeight - size;
      const position = (scrollTop / (scrollHeight - clientHeight)) * maxPos;
      setThumb({ size, position });
    } else {
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
    }
  }, [isVertical]);

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

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      if (isVertical) {
        dragStart.current = {
          pos: e.clientY,
          scrollPos: containerRef.current?.scrollTop || 0,
        };
      } else {
        dragStart.current = {
          pos: e.clientX,
          scrollPos: containerRef.current?.scrollLeft || 0,
        };
      }
    },
    [isVertical]
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;

      if (isVertical) {
        const { scrollHeight, clientHeight } = el;
        const thumbRange = clientHeight - thumb.size;
        if (thumbRange <= 0) return;
        const delta = e.clientY - dragStart.current.pos;
        el.scrollTop =
          dragStart.current.scrollPos + (delta / thumbRange) * (scrollHeight - clientHeight);
      } else {
        const { scrollWidth, clientWidth } = el;
        const thumbRange = clientWidth - thumb.size;
        if (thumbRange <= 0) return;
        const delta = e.clientX - dragStart.current.pos;
        el.scrollLeft =
          dragStart.current.scrollPos + (delta / thumbRange) * (scrollWidth - clientWidth);
      }
    };
    const handleUp = () => setDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, thumb.size, isVertical]);

  useEffect(() => {
    if (!dragging && visible) show();
  }, [dragging, visible, show]);

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

  const hasThumb = thumb.size > 0;

  return (
    <div
      ref={containerRef}
      id={id}
      data-custom-scroll
      className={className}
      style={
        {
          overflowY: isVertical ? "auto" : "hidden",
          overflowX: isVertical ? "hidden" : "auto",
          scrollbarWidth: "none",
          ...styleProp,
        } as React.CSSProperties
      }
      onScroll={handleScroll}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {hasThumb && (
        <div
          aria-hidden="true"
          style={{
            position: "sticky",
            top: isVertical ? 0 : "auto",
            bottom: isVertical ? "auto" : 0,
            left: isVertical ? "auto" : 0,
            width: isVertical ? "100%" : viewportSize,
            height: isVertical ? 0 : "100%",
            overflow: "visible",
            zIndex: 30,
            flexShrink: 0,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: isVertical ? 0 : "auto",
              bottom: isVertical ? "auto" : 0,
              right: isVertical ? 0 : "auto",
              left: isVertical ? "auto" : 0,
              width: isVertical ? 6 : viewportSize,
              height: isVertical ? viewportSize : 6,
              pointerEvents: "none",
            }}
          >
            <div
              ref={thumbRef}
              onMouseDown={handleThumbMouseDown}
              style={{
                position: "absolute",
                right: isVertical ? 1 : "auto",
                bottom: isVertical ? "auto" : 1,
                top: isVertical ? thumb.position : "auto",
                left: isVertical ? "auto" : thumb.position,
                width: isVertical ? 4 : thumb.size,
                height: isVertical ? thumb.size : 4,
                borderRadius: 2,
                // Same thumb as the `.scrollbar` style (base-and-scrollbars.css).
                backgroundColor: "var(--base-300)",
                opacity: visible ? 1 : 0,
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
};
