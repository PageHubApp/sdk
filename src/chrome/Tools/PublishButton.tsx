import React, { useCallback, useEffect, useRef, useState } from "react";
import { TbAlertTriangle, TbCheck, TbDeviceFloppy, TbLoader2 } from "react-icons/tb";

type IndicatorState = "idle" | "saving" | "success" | "error";

/** Event-driven auto-save icon. Listens to pagehub:saving/saved/save-failed CustomEvents. */
export function SaveIndicator() {
  const [state, setState] = useState<IndicatorState>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    const onSaving = () => {
      clearPendingTimeout();
      setState("saving");
    };

    const onSaved = () => {
      clearPendingTimeout();
      setState("success");
      timeoutRef.current = setTimeout(() => setState("idle"), 3000);
    };

    const onFailed = () => {
      clearPendingTimeout();
      setState("error");
      timeoutRef.current = setTimeout(() => setState("idle"), 5000);
    };

    window.addEventListener("pagehub:saving", onSaving);
    window.addEventListener("pagehub:saved", onSaved);
    window.addEventListener("pagehub:save-failed", onFailed);

    return () => {
      window.removeEventListener("pagehub:saving", onSaving);
      window.removeEventListener("pagehub:saved", onSaved);
      window.removeEventListener("pagehub:save-failed", onFailed);
      clearPendingTimeout();
    };
  }, [clearPendingTimeout]);

  switch (state) {
    case "saving":
      return <TbLoader2 className="animate-spin" />;
    case "success":
      return <TbCheck className="text-success" />;
    case "error":
      return <TbAlertTriangle className="text-warning" />;
    default:
      return <TbDeviceFloppy />;
  }
}
