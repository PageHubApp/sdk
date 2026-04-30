import { useCallback, useEffect, useRef, useState } from "react";
import { usePanelUrl } from "../../utils/usePanelUrl";

interface UsePanelSearchOptions {
  /** Trim length at or above which the input enters search mode + writes ?q. Default 1. */
  minLength?: number;
  /** ms to wait after the last keystroke before mirroring to ?q. Default 300. */
  debounceMs?: number;
  /** Auto-focus the input on mount. Default true. */
  autoFocus?: boolean;
}

/**
 * Search input wiring shared by sidebar panels (Components, Blocks). Owns:
 *  - local input state mirrored to/from `?q` URL param
 *  - debounced URL sync
 *  - focus-on-mount ref for the input
 *  - `enterSearchMode()` trigger when the trimmed input crosses `minLength`
 *  - `isSearchMode` derived flag (so callers can branch their body)
 */
export function usePanelSearch({
  minLength = 1,
  debounceMs = 300,
  autoFocus = true,
}: UsePanelSearchOptions = {}) {
  const { state: params, enterSearchMode, update: panelUpdate } = usePanelUrl();
  const [value, setValue] = useState(params.q ?? "");
  const focusRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => focusRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [autoFocus]);

  // Sync external URL changes (popstate / programmatic) back into local state.
  useEffect(() => {
    setValue(params.q ?? "");
  }, [params.q]);

  const onChange = useCallback(
    (next: string) => {
      setValue(next);
      const trimmed = next.trim();
      const meets = trimmed.length >= minLength;
      if (meets) enterSearchMode();
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        panelUpdate({ q: meets ? next : null });
      }, debounceMs);
    },
    [enterSearchMode, panelUpdate, minLength, debounceMs]
  );

  const isSearchMode = value.trim().length >= minLength;

  return { value, focusRef, onChange, isSearchMode };
}
