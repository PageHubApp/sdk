import { useEffect, useState } from "react";

interface LoadingBarProps {
  /** Whether the loading bar is active. Resets to 0 when false. */
  active: boolean;
  /** Called when loading completes (progress reaches 100). */
  onComplete?: () => void;
  /** Signal that the async work is done — ramps to 100%. */
  done?: boolean;
  /** Overlay mode: renders a blurred overlay with the bar centered. */
  overlay?: boolean;
}

/**
 * Exponential-ramp progress bar. Simulates loading by ramping toward ~92%,
 * then snaps to 100% when `done` is set. Reusable across page switching,
 * template loading, etc.
 */
export function LoadingBar({ active, done, onComplete, overlay }: LoadingBarProps) {
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

  const bar = (
    <div
      className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-white/12"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-label="Loading"
    >
      <div
        className="h-full rounded-full bg-gray-700 transition-[width] duration-150 ease-out will-change-[width] dark:bg-white/80"
        style={{ width: `${Math.max(2, progress)}%` }}
      />
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
