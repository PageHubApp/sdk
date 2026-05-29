/**
 * Registered inspector shell — breaks circular imports between Craft
 * components and the real unified settings panel.
 *
 * `RegistrySettings` calls `registerInspector()` at module load; this
 * component forwards props to whatever was registered. Not `React.lazy`.
 */
import React from "react";
import { sdkLog } from "../../../utils/logger";

let _UnifiedSettings: React.ComponentType | null = null;

export function registerInspector(component: React.ComponentType) {
  _UnifiedSettings = component;
}

export const Inspector = (props: any) => {
  if (!_UnifiedSettings) {
    sdkLog.error("Inspector was not registered. This is a circular dependency issue.");
    return null;
  }
  return React.createElement(_UnifiedSettings!, props);
};
