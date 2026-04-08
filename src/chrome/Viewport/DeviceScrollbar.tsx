import React, { useEffect, useRef } from "react";

interface DeviceScrollbarProps {
  deviceWidth: number;
  deviceHeight: number;
  deviceZoom: number;
  sideBarOpen: boolean;
  sideBarLeft: boolean;
}

/** External scrollbar that sits to the right of the mobile device frame */
export function DeviceScrollbar({ deviceWidth, deviceHeight, deviceZoom }: DeviceScrollbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const thumbHeightRef = useRef(40);
  const rafRef = useRef(0);
  const isDragging = useRef(false);

  const zoomedH = deviceHeight * deviceZoom;
  const trackH = zoomedH * 0.8;

  useEffect(() => {
    const viewport = document.getElementById("viewport");
    const container = containerRef.current;
    const thumb = thumbRef.current;
    if (!viewport || !container || !thumb) return;

    const sync = () => {
      if (isDragging.current) return;
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      if (scrollHeight <= clientHeight) {
        container.style.display = "none";
        return;
      }
      container.style.display = "";
      const deviceEl = viewport.closest("[style*='zoom']") as HTMLElement;
      if (deviceEl) {
        const rect = deviceEl.getBoundingClientRect();
        container.style.left = `${rect.right + 10}px`;
        container.style.top = `${rect.top + rect.height * 0.1}px`;
        container.style.height = `${rect.height * 0.8}px`;
      }
      const tH = container.clientHeight;
      const ratio = clientHeight / scrollHeight;
      const th = Math.max(30, ratio * tH);
      thumbHeightRef.current = th;
      thumb.style.height = `${th}px`;
      thumb.style.top = `${(scrollTop / (scrollHeight - clientHeight)) * (tH - th)}px`;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(sync);
    };

    sync();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    const observer = new MutationObserver(sync);
    observer.observe(viewport, { childList: true, subtree: true });
    const interval = setInterval(sync, 500);
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
      observer.disconnect();
      clearInterval(interval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [deviceZoom, deviceWidth, deviceHeight]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const viewport = document.getElementById("viewport");
    const thumb = thumbRef.current;
    const container = containerRef.current;
    if (!viewport || !thumb || !container) return;
    isDragging.current = true;
    viewport.style.scrollBehavior = "auto";
    const startY = e.clientY;
    const startThumbTop = parseFloat(thumb.style.top || "0");

    const onMouseMove = (ev: MouseEvent) => {
      const tH = container.clientHeight;
      const delta = ev.clientY - startY;
      const trackRange = tH - thumbHeightRef.current;
      if (trackRange <= 0) return;
      const newTop = Math.max(0, Math.min(trackRange, startThumbTop + delta));
      thumb.style.top = `${newTop}px`;
      const scrollRange = viewport.scrollHeight - viewport.clientHeight;
      viewport.scrollTop = (newTop / trackRange) * scrollRange;
    };

    const onMouseUp = () => {
      isDragging.current = false;
      viewport.style.scrollBehavior = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-5 w-1.5 rounded-full bg-border/30"
      style={{ height: `${trackH}px` }}
    >
      <div
        ref={thumbRef}
        role="presentation"
        aria-hidden="true"
        onMouseDown={onMouseDown}
        className="absolute left-0 w-full cursor-grab rounded-full bg-neutral-foreground/50 hover:bg-neutral-foreground/80 active:cursor-grabbing"
      />
    </div>
  );
}
