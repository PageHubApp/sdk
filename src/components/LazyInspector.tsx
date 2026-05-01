/**
 * Lazy wrapper for Inspector to break circular dependency.
 *
 * SDK components import this for .craft.related.toolbar instead of
 * importing Inspector directly. The actual component registers
 * itself via `registerInspector()` at module load time, so by
 * the time any component renders this wrapper, the real implementation
 * is already available — no `require()` needed.
 */
import React from "react";

let _UnifiedSettings: React.ComponentType | null = null;

export function registerInspector(component: React.ComponentType) {
  _UnifiedSettings = component;
}

export const LazyInspector = (props: any) => {
  if (!_UnifiedSettings) {
    console.error("Inspector was not registered. This is a circular dependency issue.");
    return null;
  }
  return React.createElement(_UnifiedSettings!, props);
};
