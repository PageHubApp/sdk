/**
 * Anchor context — runtime-stable per-instance ids resolved from the wrapper
 * tree.
 *
 * Wrappers like AgentFloatingBubble / AgentChat / CartDrawer publish a map
 * of named anchors (`{ panel: "ph-bubble-abc123", chat: "ph-chat-xyz" }`)
 * via `<AnchorProvider>`. Descendants reference them in string props using
 * `{{anchor.<name>}}` tokens — `Container.props.id`, action `target`/`key`,
 * `state` condition `key`, and `replaceVariables` text/href all resolve the
 * same way.
 *
 * This kills two anti-patterns:
 *   1. The `walkAndFix` first-mount tree mutation that rewrote placeholder
 *      anchor strings to nodeId-suffixed unique ids.
 *   2. Hardcoded placeholder strings (`agent-bubble-panel`, `cart-drawer`)
 *      colliding when authors drop two of the same wrapper.
 *
 * Anchors compose — nested providers merge with parent.
 */

import React, { createContext, useContext, useMemo } from "react";

export type AnchorMap = Readonly<Record<string, string>>;

const AnchorCtx = createContext<AnchorMap>({});

export function useAnchors(): AnchorMap {
  return useContext(AnchorCtx);
}

export function AnchorProvider({
  anchors,
  children,
}: {
  anchors: AnchorMap;
  children: React.ReactNode;
}) {
  const parent = useContext(AnchorCtx);
  const merged = useMemo(
    () => ({ ...parent, ...anchors }),
    // Deps are intentionally the maps themselves — wrappers should memoize
    // their `anchors` prop or pass stable references.
    [parent, anchors]
  );
  return <AnchorCtx.Provider value={merged}>{children}</AnchorCtx.Provider>;
}

const TOKEN_RE = /\{\{anchor\.([a-zA-Z0-9_-]+)\}\}/g;

/**
 * Resolve `{{anchor.X}}` tokens in a string against an anchor map. Strings
 * with no tokens pass through unchanged (cheap fast path). Unknown anchor
 * names resolve to empty string — caller decides whether that's acceptable.
 */
export function resolveAnchors(
  value: string | undefined | null,
  anchors: AnchorMap
): string | undefined {
  if (value == null) return value ?? undefined;
  if (typeof value !== "string") return value as any;
  if (!value.includes("{{anchor.")) return value;
  return value.replace(TOKEN_RE, (_, key) => anchors[key] ?? "");
}

/** True if the string contains any `{{anchor.X}}` token. */
export function hasAnchorToken(value: string | undefined | null): boolean {
  return typeof value === "string" && value.includes("{{anchor.");
}
