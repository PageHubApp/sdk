import { useEffect, useState } from "react";

/**
 * Returns `true` after the first client render. Used as a hydration guard so
 * editor-only chrome (empty-state hints, drag affordances, mount-tied effects)
 * doesn't flash during SSR/initial paint.
 *
 * Pass `initial: true` to skip the hydration delay (e.g. in viewer mode where
 * there's no editor chrome to wait on — Text uses this with `!enabled`).
 */
export function useMounted(initial = false): boolean {
  const [mounted, setMounted] = useState(initial);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
