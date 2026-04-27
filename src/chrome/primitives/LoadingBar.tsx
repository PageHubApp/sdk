import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export type LoadingBarSize = "default" | "sm";

interface LoadingBarProps {
  /** Whether the loading bar is active. Resets to 0 when false. */
  active: boolean;
  /** Called when loading completes (progress reaches 100). */
  onComplete?: () => void;
  /** Signal that the async work is done — ramps to 100%. */
  done?: boolean;
  /** Overlay mode: renders a blurred overlay with the bar centered. */
  overlay?: boolean;
  /** `sm`: thin full-width bar for sidebar / Suspense fallbacks. */
  size?: LoadingBarSize;
  /** Merged onto the track element (non-overlay). */
  className?: string;
}

/**
 * Exponential-ramp progress bar. Simulates loading by ramping toward ~92%,
 * then snaps to 100% when `done` is set. Reusable across page switching,
 * template loading, etc.
 */
export function LoadingBar({
  active,
  done,
  onComplete,
  overlay,
  size = "default",
  className,
}: LoadingBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setProgress(done ? 100 : 66);
      return;
    }

    if (done) {
      setProgress(100);
      const timeout = setTimeout(() => onComplete?.(), 200);
      return () => clearTimeout(timeout);
    }

    const floor = overlay ? 5 : 8;
    const cap = overlay ? 91 : 93;
    const tau = 520;
    setProgress(floor);
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(cap, floor + (cap - floor) * (1 - Math.exp(-elapsed / tau)));
      setProgress(p);
    }, 45);
    return () => window.clearInterval(id);
  }, [active, done, overlay, onComplete]);

  if (!active) return null;

  const trackClass =
    size === "sm"
      ? "h-1 w-full max-w-none overflow-hidden rounded-full bg-base-300/90 dark:bg-white/10"
      : "h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-white/12";

  const fillClass =
    size === "sm"
      ? "h-full rounded-full bg-base-content/45 transition-[width] duration-150 ease-out will-change-[width] dark:bg-white/55"
      : "h-full rounded-full bg-gray-700 transition-[width] duration-150 ease-out will-change-[width] dark:bg-white/80";

  const bar = (
    <div
      className={twMerge(trackClass, className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-label="Loading"
    >
      <div className={fillClass} style={{ width: `${Math.max(2, progress)}%` }} />
    </div>
  );

  if (overlay) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/55 backdrop-blur-md dark:bg-black/45"
        aria-busy="true"
        aria-label="Loading"
      >
        {bar}
      </div>
    );
  }

  return bar;
}

/**
 * Shallow placeholder for `React.Suspense` around lazy toolbar inputs.
 * Uses the same ramping bar as `LoadingBar` in a thin, full-width variant.
 */
export function LoadingBarSuspenseFallback() {
  return (
    <div className="py-2" aria-busy="true" aria-label="Loading controls">
      <LoadingBar active done={false} size="sm" />
    </div>
  );
}

/* =============================================================================
   Skeleton fallbacks — calmer alternative to the ramping progress bar.
   These mirror the actual control footprint so the panel doesn't reflow when
   the lazy chunk arrives. Pick the variant that matches the input you're
   replacing; the registry uses `RowSkeleton` as the default.
   ============================================================================= */

const skeletonChunk = "bg-base-content/5 animate-pulse rounded";

/** Ghost label (`w-20`) + ghost input — matches the canonical inline row. */
export function RowSkeleton() {
  return (
    <div
      className="flex h-8 items-center gap-0.5"
      aria-busy="true"
      aria-label="Loading control"
    >
      <span className={`${skeletonChunk} h-3 w-20 shrink-0`} aria-hidden />
      <span className={`${skeletonChunk} ml-0.5 h-8 min-w-0 flex-1`} aria-hidden />
    </div>
  );
}

/**
 * Ghost stack — full-width block with two short ghost lines + a button-shaped
 * ghost. Use for inputs that render a card-style body inside the section
 * (Conditions, Animations, Properties, ImportExport, etc.).
 */
export function BlockSkeleton() {
  return (
    <div
      className="flex flex-col gap-2"
      aria-busy="true"
      aria-label="Loading section"
    >
      <span className={`${skeletonChunk} h-3 w-1/3`} aria-hidden />
      <span className={`${skeletonChunk} h-8 w-full`} aria-hidden />
      <span className={`${skeletonChunk} h-8 w-2/3`} aria-hidden />
    </div>
  );
}

/** Ghost chip — single button-height pill, e.g. for popover triggers. */
export function ChipSkeleton() {
  return (
    <div
      className="flex h-8 items-center"
      aria-busy="true"
      aria-label="Loading control"
    >
      <span className={`${skeletonChunk} h-8 w-full`} aria-hidden />
    </div>
  );
}
