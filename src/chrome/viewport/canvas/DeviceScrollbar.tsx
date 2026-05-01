import React, { useEffect, useRef } from "react";
import { useDragGesture } from "../../hooks/useDragGesture";

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

  const startThumbTopRef = useRef(0);
  const viewportRef = useRef<HTMLElement | null>(null);

  const { onPointerDown } = useDragGesture({
    onStart: (e) => {
      e.preventDefault();
      const viewport = document.getElementById("viewport");
      const thumb = thumbRef.current;
      if (!viewport || !thumb || !containerRef.current) return false;
      viewportRef.current = viewport;
      isDragging.current = true;
      viewport.style.scrollBehavior = "auto";
      startThumbTopRef.current = parseFloat(thumb.style.top || "0");
    },
    onMove: (_e, m) => {
      const viewport = viewportRef.current;
      const thumb = thumbRef.current;
      const container = containerRef.current;
      if (!viewport || !thumb || !container) return;
      const tH = container.clientHeight;
      const trackRange = tH - thumbHeightRef.current;
      if (trackRange <= 0) return;
      const newTop = Math.max(0, Math.min(trackRange, startThumbTopRef.current + m.dy));
      thumb.style.top = `${newTop}px`;
      const scrollRange = viewport.scrollHeight - viewport.clientHeight;
      viewport.scrollTop = (newTop / trackRange) * scrollRange;
    },
    onEnd: () => {
      isDragging.current = false;
      if (viewportRef.current) viewportRef.current.style.scrollBehavior = "";
      viewportRef.current = null;
    },
  });

  return (
    <div
      ref={containerRef}
      className="bg-border/30 fixed z-5 w-1.5 rounded-full"
      style={{ height: `${trackH}px` }}
    >
      <div
        ref={thumbRef}
        role="presentation"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        className="bg-neutral-foreground/50 hover:bg-neutral-foreground/80 absolute left-0 w-full cursor-grab touch-none rounded-full active:cursor-grabbing"
      />
    </div>
  );
}
