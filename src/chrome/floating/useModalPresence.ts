import { useEffect, useState } from "react";

/** Shared timing so the backdrop and the panel arrive and leave together. */
export const MODAL_DURATION_MS = 250;
export const MODAL_EASING = "cubic-bezier(0.19, 1, 0.22, 1)";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Mount / transition state for an overlay that animates with plain CSS
 * transitions (no animation library).
 *
 * - `mounted` — render the overlay. True as soon as `isOpen` is, and stays true
 *   for `durationMs` after it closes so the exit transition can play.
 * - `shown` — the transition target. Flips true two frames after mount (the
 *   first frame paints the closed state, so the browser has something to
 *   transition from) and false the moment `isOpen` does.
 * - `durationMs` — 0 when the user prefers reduced motion.
 */
export function useModalPresence(isOpen: boolean): {
  mounted: boolean;
  shown: boolean;
  durationMs: number;
} {
  const [mounted, setMounted] = useState(isOpen);
  const [shown, setShown] = useState(false);
  const durationMs = prefersReducedMotion() ? 0 : MODAL_DURATION_MS;

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), durationMs);
    return () => clearTimeout(timer);
  }, [isOpen, durationMs]);

  return { mounted: mounted || isOpen, shown: shown && isOpen, durationMs };
}
