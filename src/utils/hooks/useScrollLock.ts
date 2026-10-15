import { useEffect } from "react";

let lockCount = 0;
let savedBody = "";
let savedHtml = "";

/**
 * Stops the page behind an overlay (modal, drawer, full-screen picker) from
 * scrolling while `locked` is true. Locks both `<html>` and `<body>` — which one
 * scrolls depends on the page's CSS.
 *
 * Counted, not nested: the first lock saves the inline values and the last
 * unlock restores them, so stacked overlays can close in any order (two that
 * unmount together release in mount order, which a save/restore pair per
 * overlay would get backwards and leave the page locked).
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { body, documentElement: html } = document;
    if (lockCount === 0) {
      savedBody = body.style.overflow;
      savedHtml = html.style.overflow;
      body.style.overflow = "hidden";
      html.style.overflow = "hidden";
    }
    lockCount++;
    return () => {
      lockCount--;
      if (lockCount > 0) return;
      body.style.overflow = savedBody;
      html.style.overflow = savedHtml;
    };
  }, [locked]);
}
