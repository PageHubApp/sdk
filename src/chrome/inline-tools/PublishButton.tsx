import React, { useEffect, useState } from "react";
import { TbAlertTriangle, TbCheck, TbDeviceFloppy, TbLoader2 } from "react-icons/tb";
import { useSDK } from "../../core/context";
import type { SaveStatus } from "../../types";

/** Save status icon driven by the SDK save coordinator. */
export function SaveIndicator() {
  const { subscribeSaveStatus } = useSDK();
  const [state, setState] = useState<SaveStatus>("idle");

  useEffect(() => {
    return subscribeSaveStatus(setState);
  }, [subscribeSaveStatus]);

  switch (state) {
    case "saving":
      return <TbLoader2 className="animate-spin" />;
    case "saved":
      return <TbCheck className="text-success" />;
    case "failed":
      return <TbAlertTriangle className="text-warning" />;
    default:
      return <TbDeviceFloppy />;
  }
}
