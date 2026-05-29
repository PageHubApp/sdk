import React, { useEffect, useState } from "react";
import { TbAlertTriangle, TbCheck, TbDeviceFloppy, TbLoader2 } from "react-icons/tb";
import { useSDK } from "../../../core/context";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../primitives/layout/tooltipSurface";
import type { SaveStatus } from "../../../types";

const LABELS: Record<SaveStatus, string> = {
  idle: "All changes saved",
  saving: "Saving…",
  saved: "Saved",
  failed: "Save failed — your changes are unsaved",
};

/** Save status icon driven by the SDK save coordinator. */
export function SaveIndicator() {
  const { subscribeSaveStatus } = useSDK();
  const [state, setState] = useState<SaveStatus>("idle");

  useEffect(() => {
    return subscribeSaveStatus(setState);
  }, [subscribeSaveStatus]);

  const label = LABELS[state];
  const Icon =
    state === "saving"
      ? TbLoader2
      : state === "saved"
        ? TbCheck
        : state === "failed"
          ? TbAlertTriangle
          : TbDeviceFloppy;

  const iconClass =
    state === "saving"
      ? "animate-spin"
      : state === "saved"
        ? "text-success"
        : state === "failed"
          ? "text-warning"
          : undefined;

  return (
    <span
      role="status"
      aria-live={state === "failed" ? "assertive" : "polite"}
      aria-label={label}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={label}
      className="inline-flex items-center"
    >
      <Icon className={iconClass} aria-hidden />
    </span>
  );
}
