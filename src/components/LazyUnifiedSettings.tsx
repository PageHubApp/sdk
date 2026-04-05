// @ts-nocheck
/**
 * Lazy wrapper for UnifiedSettings to break circular dependency.
 *
 * SDK components import this for .craft.related.toolbar instead of
 * importing UnifiedSettings directly. The actual component registers
 * itself via `registerUnifiedSettings()` at module load time, so by
 * the time any component renders this wrapper, the real implementation
 * is already available — no `require()` needed.
 */
import React from "react";

let _UnifiedSettings: React.ComponentType | null = null;

export function registerUnifiedSettings(component: React.ComponentType) {
  _UnifiedSettings = component;
}

export const LazyUnifiedSettings = (props: any) => {
  if (!_UnifiedSettings) {
    console.error("UnifiedSettings was not registered. This is a circular dependency issue.");
    return null;
  }
  return React.createElement(_UnifiedSettings!, props);
};
