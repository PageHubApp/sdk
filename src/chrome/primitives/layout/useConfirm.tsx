import React, { useCallback, useRef, useState } from "react";

import { ConfirmDialog } from "./ConfirmDialog";

type ConfirmOptions = Omit<
  React.ComponentProps<typeof ConfirmDialog>,
  "isOpen" | "onClose" | "onConfirm"
>;

/**
 * `ConfirmDialog` as an awaitable call, for a handler that asks before it acts:
 *
 *   const { ask, dialog } = useConfirm();
 *   if (!(await ask({ title: "Delete this lead?", message: "…", confirmText: "Delete" }))) return;
 *   …
 *   return <>{…}{dialog}</>;
 *
 * Resolves true on confirm, false on cancel / ESC / backdrop.
 */
export function useConfirm() {
  // Kept after close so the dialog keeps its text while it fades out.
  const [options, setOptions] = useState<ConfirmOptions>({ title: "", message: "" });
  const [open, setOpen] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpen(false);
  }, []);

  const ask = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>(resolve => {
      resolver.current = resolve;
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      {...options}
      isOpen={open}
      onConfirm={() => settle(true)}
      onClose={() => settle(false)}
    />
  );

  return { ask, dialog };
}
